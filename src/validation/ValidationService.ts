import { Transaction } from '../entities/Transaction';
import { PricingTierResult, PricingService } from '../services/PricingService';
import { components } from '../types/marketplace-api';
import { deploymentTypeFromHosting } from './validationUtils';
import { PriceCalcOpts, PriceCalculatorService, PriceResult } from './PriceCalculatorService';
import { inject, injectable } from 'inversify';
import { TYPES } from '../config/types';
import TransactionDaoService from '../services/TransactionDaoService';
import TransactionReconcileDaoService from '../services/TransactionReconcileDaoService';
import { LicenseDaoService } from '../services/LicenseDaoService';
import { formatCurrency } from '../utils/formatCurrency';
import { ResellerDaoService } from '../services/ResellerDaoService';
import { TransactionAdjustment } from '../entities/TransactionAdjustment';
import { TransactionAdjustmentDaoService } from '../services/TransactionAdjustmentDaoService';

const START_DATE = '2024-01-01';
const MAX_JPY_DRIFT = 0.15; // Atlassian generally allows a 15% buffer for Japanese Yen transactions

export type PurchaseDetails = components['schemas']['TransactionPurchaseDetails'];

interface PriceWithPricingOpts {
    price: PriceResult;
    pricingOpts: PriceCalcOpts;
}

interface TransactionValidationResult {
    isExpectedPrice: boolean;
    valid: boolean;
    vendorAmount: number;
    expectedVendorAmount: number;
    notes: string[];
    pricingOpts: PriceCalcOpts;
}

interface LegacyPricePermutation {
    useLegacyPricingTierForCurrent: boolean;
    useLegacyPricingTierForPrevious: boolean;
}

// List of various permutations of legacy pricing (or not) for both the main transaction and the
// license we are upgrading from (if any).

const LEGACY_PRICING_PERMUTATIONS : LegacyPricePermutation[] = [
    { useLegacyPricingTierForCurrent: false, useLegacyPricingTierForPrevious: false },  // start with no legacy pricing
    { useLegacyPricingTierForCurrent: true, useLegacyPricingTierForPrevious: false },   // try different permutations of legacy pricing
    { useLegacyPricingTierForCurrent: false, useLegacyPricingTierForPrevious: true },
    { useLegacyPricingTierForCurrent: true, useLegacyPricingTierForPrevious: true },
    { useLegacyPricingTierForCurrent: false, useLegacyPricingTierForPrevious: false },  // Must end with no legacy pricing (again) if we find no match
];

const USE_EXPECTED_DISCOUNT_PERMUTATIONS : boolean[] = [
    true,
    false,
    true // Must end with true (again) if we find no match to produce expected price with discounts
];

@injectable()
export class ValidationService {
    constructor(
        @inject(TYPES.PricingService) private pricingService: PricingService,
        @inject(TYPES.PriceCalculatorService) private priceCalculatorService: PriceCalculatorService,
        @inject(TYPES.TransactionDaoService) private transactionDaoService: TransactionDaoService,
        @inject(TYPES.TransactionReconcileDaoService) private transactionReconcileDaoService: TransactionReconcileDaoService,
        @inject(TYPES.LicenseDaoService) private licenseDaoService: LicenseDaoService,
        @inject(TYPES.ResellerDaoService) private resellerDaoService: ResellerDaoService,
        @inject(TYPES.TransactionAdjustmentDaoService) private transactionAdjustmentDaoService: TransactionAdjustmentDaoService
    ) {
    }

    public async validateTransactions(): Promise<void> {
        const transactions = await this.transactionDaoService.getTransactionsBySaleDate(START_DATE);
        console.log(`\nValidating transactions since ${START_DATE}:`);

        let validCount = 0;
        let expectedPriceCount = 0;

        for (const transaction of transactions) {

            if (false) { // transaction.entitlementId !== 'SEN-xxxxxx') {
                // problem with this transaction:
                // the prior period license (from which we are upgrading) was also calculated using
                // the legacy pricing period, so we need to figure out how to determine that this was
                // the case. Recursive evaluation of the prior transaction?
                continue;
            }

            try {
                const expectedDiscount = await this.calculateExpectedDiscountForTransaction(transaction);
                const validationResult = await this.validateOneTransactionWithPricingPermutations({ transaction, expectedDiscount });

                if (validationResult) {
                    await this.recordTransactionReconcile({ validationResult, transaction });
                    await this.logTransactionValidation({ validationResult, transaction });

                    if (validationResult.isExpectedPrice) {
                        expectedPriceCount++;
                    }

                    if (validationResult.valid) {
                        validCount++;
                    }
                }
            } catch (error: any) {
                console.log(`\nTransaction ${transaction.marketplaceTransactionId}:`);
                console.log(`- Error: ${error.message}`);
            }
        }

        console.log(`\nSummary: ${transactions.length} transactions; ${expectedPriceCount} have expected price; ${validCount} are reconciled.`);
    }

    private async validateOneTransactionWithPricingPermutations(opts: { transaction: Transaction; expectedDiscount: number; }) : Promise<TransactionValidationResult|undefined> {
        const { transaction, expectedDiscount } = opts;
        let validationResult : TransactionValidationResult|undefined = undefined;

        // For this transaction, try various permutations of legacy pricing (or not) for both
        // the main transaction, as well as the license we are upgrading from (if any).
        //
        // Also try permutations of using or not using the expected discount

        for (const legacyPricePermutation of LEGACY_PRICING_PERMUTATIONS) {
            const discountPermutations = expectedDiscount > 0 ? USE_EXPECTED_DISCOUNT_PERMUTATIONS : [ true ];

            for (const useExpectedDiscount of discountPermutations) {
                const { useLegacyPricingTierForCurrent, useLegacyPricingTierForPrevious } = legacyPricePermutation;

                // Try to see if the price matches with this permutation of legacy pricing (or not)

                validationResult = await this.validateOneTransaction({
                    transaction,
                    useLegacyPricingTierForCurrent,
                    useLegacyPricingTierForPrevious,
                    expectedDiscount: useExpectedDiscount ? expectedDiscount : 0
                });

                const { isExpectedPrice, notes } = validationResult;

                if (isExpectedPrice) {
                    if (useLegacyPricingTierForCurrent) {
                        notes.push(`Price is correct but uses legacy pricing for current transaction`);
                    }

                    if (useLegacyPricingTierForPrevious) {
                        notes.push(`Price is correct but uses legacy pricing for previous transaction`);
                    }

                    if (!useExpectedDiscount) {
                        notes.push(`Price is correct but expected discount of ${formatCurrency(expectedDiscount)} was not applied`);
                    }

                    // Return early if we find the expected price
                    return validationResult;
                }
            }
        }

        // Otherwise, return the validation result with no legacy pricing but all adjustments applied
        return validationResult;
    }

    private async validateOneTransaction(opts: {
        transaction: Transaction;
        useLegacyPricingTierForCurrent: boolean;
        useLegacyPricingTierForPrevious: boolean;
        expectedDiscount: number;
    }): Promise<TransactionValidationResult> {
        const { transaction, useLegacyPricingTierForCurrent, useLegacyPricingTierForPrevious, expectedDiscount } = opts;
        const { data, entitlementId } = transaction;
        const { addonKey, purchaseDetails } = data;
        const {
            vendorAmount,
            saleType,
            saleDate
        } = purchaseDetails;

        const deploymentType = deploymentTypeFromHosting(purchaseDetails.hosting);
        const pricingTierResult = await this.pricingService.getPricingTiers({ addonKey, deploymentType, saleDate });
        const isSandbox = await this.isSandbox({ vendorAmount, transaction });

        // If it is an upgrade, we need to also load the previous purchase and potentially-different
        // pricing tiers for that transaction.

        let previousPurchase : Transaction | undefined;
        let previousPurchasePricingTierResult : PricingTierResult | undefined;
        let expectedDiscountForPreviousPurchase : number | undefined;

        if (saleType==='Upgrade') {
            const relatedTransactions = await this.transactionDaoService.loadRelatedTransactions(entitlementId);
            previousPurchase = this.getPreviousPurchase({ relatedTransactions, thisTransaction: transaction });

            if (previousPurchase) {
                const { saleDate: previousSaleDate } = previousPurchase.data.purchaseDetails;
                previousPurchasePricingTierResult = await this.pricingService.getPricingTiers({ addonKey, deploymentType, saleDate: previousSaleDate });
                expectedDiscountForPreviousPurchase = await this.calculateExpectedDiscountForTransaction(previousPurchase);
            }
        }

        // Calculate the expected price for the previous purchase, if it exists.

        const previousPricing = previousPurchase && previousPurchasePricingTierResult && typeof expectedDiscountForPreviousPurchase !== 'undefined' ? this.calculatePriceForTransaction({ transaction: previousPurchase, isSandbox: false, pricingTierResult: previousPurchasePricingTierResult, useLegacyPricingTier: useLegacyPricingTierForPrevious, expectedDiscount: expectedDiscountForPreviousPurchase }) : undefined;

        // Calculate the expected price for the current transaction.

        const { price, pricingOpts } = this.calculatePriceForTransaction({ transaction, isSandbox, pricingTierResult: pricingTierResult, previousPurchase, previousPricing: previousPricing?.price, useLegacyPricingTier: useLegacyPricingTierForCurrent, expectedDiscount });

        let expectedVendorAmount = price.vendorPrice;

        // TRY TO SEE IF WE HAVE ANY EXPERT RESALES TO PRICE-MATCH

        // Now compare the prices and see if the actual price is what we expect.

        let { valid, notes } = this.isPriceValid({ vendorAmount, expectedVendorAmount, country: transaction.data.customerDetails.country });
        const isExpectedPrice = valid;

        // Even if price is as expected, refunds always require approval

        if (saleType==='Refund') {
            notes.push('Refund requires manual approval');
            valid = false;
        }

        return {
            isExpectedPrice,
            valid,
            vendorAmount,
            expectedVendorAmount,
            notes,
            pricingOpts
        };
    }

    private async recordTransactionReconcile(opts: { validationResult: TransactionValidationResult, transaction: Transaction; }) : Promise<void> {
        const { validationResult, transaction } = opts;
        const { valid, notes, vendorAmount, expectedVendorAmount } = validationResult;

        // Check if a reconcile record already exists for this transaction and version

        const existingReconcile = await this.transactionReconcileDaoService.getTransactionReconcileForTransaction(transaction);

        // Don't re-reconcile if no new version has been created

        if (existingReconcile && existingReconcile.transactionVersion===transaction.currentVersion) {
            return;
        }

        // Record the reconcile record

        await this.transactionReconcileDaoService.recordReconcile({ transaction, existingReconcile, valid, notes, vendorAmount, expectedVendorAmount });
    }

    private async logTransactionValidation(opts: { validationResult: TransactionValidationResult; transaction: Transaction; }) {
        const { validationResult, transaction } = opts;

        const { valid, notes, vendorAmount, expectedVendorAmount, pricingOpts } = validationResult;

        const { data, entitlementId } = transaction;
        const { purchaseDetails } = data;
        const {
            saleType,
            saleDate
        } = purchaseDetails;


        const actualFormatted = formatCurrency(vendorAmount);
        const expectedFormatted = formatCurrency(expectedVendorAmount);

        if (valid) {
            console.log(`OK      ${saleDate} ${saleType.padEnd(7)} L=${entitlementId.padEnd(17)} Expected: ${expectedFormatted.padEnd(10)}; actual: ${actualFormatted.padEnd(10)} ${notes.join('; ')}`);
        } else {
            console.log(`*ERROR* ${saleDate} ${saleType.padEnd(7)} L=${entitlementId.padEnd(17)} Expected: ${expectedFormatted.padEnd(10)}; actual: ${actualFormatted.padEnd(10)}; ID=${transaction.id}. ${notes.join('; ')}`);
            console.log(`Pricing opts: `);
            console.dir(pricingOpts, { depth: 1 });
        }
    }

    // Returns true if the transaction represents a sandbox instance

    private async isSandbox(opts: { vendorAmount: number; transaction: Transaction }) : Promise<boolean> {
        const { vendorAmount, transaction } = opts;

        if (vendorAmount !== 0) {
            return false;
        }

        const license = await this.licenseDaoService.loadLicenseForTransaction(transaction);

        if (!license) {
            return false;
        }

        return license.data.installedOnSandbox ? true : false;
    }

    // Invokes the PriceCalculatorService to calculate the expected price for a transaction.

    private calculatePriceForTransaction(opts: {
        transaction: Transaction;
        isSandbox: boolean;
        pricingTierResult: PricingTierResult;
        previousPurchase?: Transaction|undefined;
        previousPricing?: PriceResult|undefined;
        useLegacyPricingTier: boolean;
        expectedDiscount: number;
    }) : PriceWithPricingOpts {
        const { transaction, isSandbox, pricingTierResult, previousPurchase, previousPricing, useLegacyPricingTier, expectedDiscount } = opts;
        const { purchaseDetails } = transaction.data;

        const pricingOpts: PriceCalcOpts = {
            pricingTierResult: pricingTierResult,
            saleType: purchaseDetails.saleType,
            saleDate: purchaseDetails.saleDate,
            isSandbox,
            hosting: purchaseDetails.hosting,
            licenseType: purchaseDetails.licenseType,
            tier: purchaseDetails.tier,
            maintenanceStartDate: purchaseDetails.maintenanceStartDate,
            maintenanceEndDate: purchaseDetails.maintenanceEndDate,
            billingPeriod: purchaseDetails.billingPeriod,
            previousPurchaseMaintenanceEndDate: previousPurchase?.data.purchaseDetails.maintenanceEndDate,
            previousPricing,
            expectedDiscount
        };

        // If asked to use the legacy pricing tier for this transaction, switch out the data sent to the calculator

        if (useLegacyPricingTier && pricingTierResult.priorTiers) {
            pricingOpts.pricingTierResult = {
                tiers: pricingTierResult.priorTiers,
                priorTiers: undefined,
                priorPricingEndDate: undefined
            };
        };

        const price = this.priceCalculatorService.calculateExpectedPrice(pricingOpts);
        return { price, pricingOpts };
    }

    // Tests to see if the expected price is within a reasonable range of the actual price, given
    // Atlassian's pricing logic.

    private isPriceValid(opts: { expectedVendorAmount: number; vendorAmount: number; country: string; }) : { valid: boolean; notes: string[] } {
        const { expectedVendorAmount, vendorAmount, country } = opts;

        if (country==='Japan') {
            const valid = vendorAmount >= expectedVendorAmount*(1-MAX_JPY_DRIFT) &&
                vendorAmount <= expectedVendorAmount*(1+MAX_JPY_DRIFT) &&
                !(vendorAmount===0 && expectedVendorAmount > 0);

            return { valid, notes: ['Japan sales priced in JPY are allowed drift.'] };
        }

        const valid = (vendorAmount >= expectedVendorAmount-10 &&
                vendorAmount <= expectedVendorAmount+10 &&
                !(vendorAmount===0 && expectedVendorAmount > 0));

        return { valid, notes: [] };
    }

    // This function gets the most recent transaction that is not a refund. This may not be entirely correct,
    // but if the purchase history is more complicated, then it probably needs manual review anyway.
    //
    // The relatedTransactions array must be sorted by descending sale date.
    //
    // TODO FIXME: what if multiple transactions created on the same day?

    private getPreviousPurchase(opts: { relatedTransactions: Transaction[]; thisTransaction: Transaction; }) : Transaction | undefined {
        const { relatedTransactions, thisTransaction } = opts;

        const thisTransactionIndex = relatedTransactions.findIndex(t => t.id === thisTransaction.id);

        if (thisTransactionIndex === -1 || thisTransactionIndex === relatedTransactions.length-1) {
            return undefined;
        }

        const subsequentTransactions = relatedTransactions.slice(thisTransactionIndex+1);
        return subsequentTransactions.find(t => t.data.purchaseDetails.saleType !== 'Refund');
    }

    private async getActualAdjustments(transaction: Transaction) : Promise<TransactionAdjustment[]> {
        const adjustments = await this.transactionAdjustmentDaoService.getAdjustmentsForTransaction(transaction);
        return adjustments;
    }

    private async generateExpectedAdjustments(transaction: Transaction) : Promise<TransactionAdjustment[]> {
        const resellerName = transaction.data.partnerDetails?.partnerName;
        const reseller = await this.resellerDaoService.findMatchingReseller(resellerName);

        if (!reseller) {
            return [];
        }

        const { discountAmount } = reseller;

        if (discountAmount > 1) {
            throw new Error(`Reseller discount amount cannot be greater than 100%: ${discountAmount} for ${resellerName}`);
        }

        if (discountAmount <= 0) {
            return [];
        }

        const { purchasePrice } = transaction.data.purchaseDetails

        // Reseller discount is a percentage expressed as 0.05 = 5%
        //
        // The discount has already been applied to the purchase price, so we need to reverse it
        // to get the original purchase price.

        let purchasePriceDiscount = (purchasePrice / (1-discountAmount)) - purchasePrice;

        // Discount is always positive, even for refunds

        if (purchasePriceDiscount < 0) {
            purchasePriceDiscount = -purchasePriceDiscount;
        }

        const adjustment = new TransactionAdjustment();
        adjustment.transaction = transaction;
        adjustment.purchasePriceDiscount = purchasePriceDiscount;
        adjustment.notes = `Automatic reseller discount of ${formatCurrency(discountAmount)} for ${resellerName}`;

        return [adjustment];
    }

    private async calculateExpectedDiscountForTransaction(transaction: Transaction) : Promise<number> {
        // Check to see if we expect any reseller adjustments for this transaction

        const expectedAdjustments = await this.generateExpectedAdjustments(transaction);
        const actualAdjustments = await this.getActualAdjustments(transaction);

        // If any adjustments were actually persisted to the database, use those. If not,
        // generate the adjustments we expect (such as reseller discounts).

        const shouldApplyActualAdjustments = actualAdjustments.length > 0;
        const adjustmentsToApply = shouldApplyActualAdjustments ? actualAdjustments : expectedAdjustments;
        const expectedDiscount = adjustmentsToApply.reduce((acc, adjustment) => acc + (adjustment.purchasePriceDiscount || 0), 0);
        return expectedDiscount;
    }
}
