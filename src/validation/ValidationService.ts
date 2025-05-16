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
import { getLicenseDurationInDays } from './licenseDurationCalculator';

const DEFAULT_START_DATE = '2024-01-01';
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
    price: PriceResult;
    expectedVendorAmount: number;
    notes: string[];
    pricingOpts: PriceCalcOpts;
}

interface LegacyPricePermutation {
    useLegacyPricingTierForCurrent: boolean;
    useLegacyPricingTierForPrevious: boolean;
}

interface DiscountResult {
    discountToUse: number;
    hasExpectedAdjustments: boolean;
    hasActualAdjustments: boolean;
    adjustmentNotes: string[];
}

// List of various permutations of legacy pricing (or not) for both the main transaction and the
// license we are upgrading from (if any).

const LEGACY_PRICING_PERMUTATIONS_WITH_UPGRADE : LegacyPricePermutation[] = [
    { useLegacyPricingTierForCurrent: false, useLegacyPricingTierForPrevious: false },  // start with no legacy pricing
    { useLegacyPricingTierForCurrent: true, useLegacyPricingTierForPrevious: false },   // try different permutations of legacy pricing
    { useLegacyPricingTierForCurrent: false, useLegacyPricingTierForPrevious: true },
    { useLegacyPricingTierForCurrent: true, useLegacyPricingTierForPrevious: true },
    { useLegacyPricingTierForCurrent: false, useLegacyPricingTierForPrevious: false },  // Must end with no legacy pricing (again) if we find no match
];

const LEGACY_PRICING_PERMUTATIONS_NO_UPGRADE : LegacyPricePermutation[] = [
    { useLegacyPricingTierForCurrent: false, useLegacyPricingTierForPrevious: false },  // start with no legacy pricing
    { useLegacyPricingTierForCurrent: true, useLegacyPricingTierForPrevious: false },
    { useLegacyPricingTierForCurrent: false, useLegacyPricingTierForPrevious: false },  // Must end with no legacy pricing (again) if we find no match
];

const EXPECTED_DISCOUNT_PERMUTATIONS_WITH_ACTUAL_ADJUSTMENTS : boolean[] = [
    true,
    false,
    true // Must end with true (again) if we find no match to produce expected price with discounts
];

const EXPECTED_DISCOUNT_PERMUTATIONS_WITH_ESTIMATED_ADJUSTMENTS : boolean[] = [
    true,
    false // Ends with no discounts applied on failure, so that our summary does not show the impact of potentially-incorrect estimated discounts
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

    /**
     * Validate all transactions in the database
     * @param startDate Optional start date to filter transactions
     */
    async validateTransactions(startDate?: string|null): Promise<void> {
        const actualStartDate = startDate ?? DEFAULT_START_DATE;
        const transactions = await this.transactionDaoService.getTransactionsBySaleDate(actualStartDate);
        console.log(`\nValidating transactions since ${actualStartDate}:`);

        let validCount = 0;
        let expectedPriceCount = 0;

        for (const transaction of transactions) {
            try {
                const discountResult = await this.calculateExpectedDiscountForTransaction(transaction);
                const validationResult = await this.validateOneTransactionWithPricingPermutations({ transaction, discountResult });

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

        const invalidCount = transactions.length - expectedPriceCount;

        console.log(`\nSummary: ${transactions.length} transactions; ${expectedPriceCount} have expected price; ${validCount} are reconciled; ${invalidCount} need correction.`);
    }

    private async validateOneTransactionWithPricingPermutations(opts: { transaction: Transaction; discountResult: DiscountResult; }) : Promise<TransactionValidationResult|undefined> {
        const { transaction, discountResult } = opts;
        const { discountToUse } = discountResult;

        let validationResult : TransactionValidationResult|undefined = undefined;

        const legacyPricePermutations = transaction.data.purchaseDetails.saleType === 'Upgrade'
                                            ? LEGACY_PRICING_PERMUTATIONS_WITH_UPGRADE
                                            : LEGACY_PRICING_PERMUTATIONS_NO_UPGRADE;

        // For this transaction, try various permutations of legacy pricing (or not) for both
        // the main transaction, as well as the license we are upgrading from (if any).

        for (const legacyPricePermutation of legacyPricePermutations) {

            // Also try permutations of using or not using the expected discount, but only if a discount exists

            let discountPermutations : boolean[] = [ true ];

            if (discountToUse !== 0) {
                discountPermutations = discountResult.hasActualAdjustments
                    ? EXPECTED_DISCOUNT_PERMUTATIONS_WITH_ACTUAL_ADJUSTMENTS // if no match, still apply user-requested discounts in totals
                    : EXPECTED_DISCOUNT_PERMUTATIONS_WITH_ESTIMATED_ADJUSTMENTS; // if no match, remove estimated discounts from totals
            }

            for (const useExpectedDiscount of discountPermutations) {
                const { useLegacyPricingTierForCurrent, useLegacyPricingTierForPrevious } = legacyPricePermutation;

                // Try to see if the price matches with this permutation of legacy pricing (or not)

                validationResult = await this.validateOneTransaction({
                    transaction,
                    useLegacyPricingTierForCurrent,
                    useLegacyPricingTierForPrevious,
                    expectedDiscount: useExpectedDiscount ? discountToUse : 0
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
                        notes.push(`Price is correct but expected discount of ${formatCurrency(discountToUse)} was not applied`);
                    }
                }

                discountResult.adjustmentNotes.forEach(n => notes.push(`Adjustment: ${n}`));

                // Now return early if we find the expected price

                if (isExpectedPrice) {
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
            saleDate,
            maintenanceStartDate,
            maintenanceEndDate
        } = purchaseDetails;

        const deploymentType = deploymentTypeFromHosting(purchaseDetails.hosting);
        const pricingTierResult = await this.pricingService.getPricingTiers({ addonKey, deploymentType, saleDate });
        const isSandbox = await this.isSandbox({ vendorAmount, transaction });

        // If it is an upgrade, we need to also load the previous purchase and potentially-different
        // pricing tiers for that transaction.

        let previousPurchase : Transaction | undefined;
        let previousPurchasePricingTierResult : PricingTierResult | undefined;
        let expectedDiscountForPreviousPurchase : DiscountResult | undefined;

        if (saleType==='Upgrade' || saleType==='Renewal') {
            const relatedTransactions = await this.transactionDaoService.loadRelatedTransactions(entitlementId);
            previousPurchase = this.getPreviousPurchase({ relatedTransactions, thisTransaction: transaction });

            if (previousPurchase) {
                const { saleDate: previousSaleDate } = previousPurchase.data.purchaseDetails;
                previousPurchasePricingTierResult = await this.pricingService.getPricingTiers({ addonKey, deploymentType, saleDate: previousSaleDate });
                expectedDiscountForPreviousPurchase = await this.calculateExpectedDiscountForTransaction(previousPurchase);
            }
        }

        // Calculate the expected price for the previous purchase, if it exists.

        const previousPricing = saleType==='Upgrade' && previousPurchase && previousPurchasePricingTierResult && typeof expectedDiscountForPreviousPurchase !== 'undefined'
                        ? this.calculatePriceForTransaction({ transaction: previousPurchase, isSandbox: false, pricingTierResult: previousPurchasePricingTierResult, useLegacyPricingTier: useLegacyPricingTierForPrevious, expectedDiscount: expectedDiscountForPreviousPurchase.discountToUse })
                        : undefined;

        // Calculate the expected price for the current transaction.

        const { price, pricingOpts } = this.calculatePriceForTransaction({ transaction, isSandbox, pricingTierResult: pricingTierResult, previousPurchase, previousPricing: previousPricing?.price, useLegacyPricingTier: useLegacyPricingTierForCurrent, expectedDiscount });

        let expectedVendorAmount = price.vendorPrice;

        // Now compare the prices and see if the actual price is what we expect.

        let { valid, notes } = this.isPriceValid({ vendorAmount, expectedVendorAmount, country: transaction.data.customerDetails.country });
        const isExpectedPrice = valid;

        // Also validate the start/end dates of the license
        const licenseDurationInDays = getLicenseDurationInDays(maintenanceStartDate, maintenanceEndDate);
        const { licenseType } = purchaseDetails;

        if ((saleType==='Upgrade' || saleType==='Renewal') &&
            licenseDurationInDays !== 0  &&
            licenseType !== 'COMMUNITY') {

            if (!previousPurchase) {
                notes.push('Could not find previous purchase');
                valid = false;
            } else {
                const { maintenanceEndDate: priorMaintenanceEndDate } = previousPurchase?.data.purchaseDetails;

                if (priorMaintenanceEndDate < maintenanceStartDate) {
                    notes.push(`Gap in licensing: previous maintenance ended on ${priorMaintenanceEndDate} but this license starts on ${maintenanceStartDate}`);
                    valid = false;
                }
            }
        }

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
            price,
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

        const { valid, notes, vendorAmount, expectedVendorAmount, pricingOpts, price } = validationResult;

        const { data, entitlementId } = transaction;
        const { purchaseDetails } = data;
        const {
            saleType,
            saleDate,
            purchasePrice
        } = purchaseDetails;


        const actualVendorFormatted = formatCurrency(vendorAmount);
        const expectedVendorFormatted = formatCurrency(expectedVendorAmount);

        const actualPurchase = purchasePrice;
        const expectedPurchase = price.purchasePrice;

        const actualPurchaseFormatted = formatCurrency(actualPurchase);
        const expectedPurchaseFormatted = formatCurrency(expectedPurchase);

        if (valid) {
            console.log(`OK      ${saleDate} ${saleType.padEnd(7)} L=${entitlementId.padEnd(17)} Expected vendor: ${expectedVendorFormatted.padEnd(10)}; actual vendor: ${actualVendorFormatted.padEnd(10)} ${notes.join('; ')}`);
        } else {
            const diff = expectedPurchase - actualPurchase;
            console.log(`*ERROR* ${saleDate} ${saleType.padEnd(7)} L=${entitlementId.padEnd(17)} Expected vendor: ${expectedVendorFormatted.padEnd(10)}; actual vendor: ${actualVendorFormatted.padEnd(10)}; expected purchase: ${expectedPurchaseFormatted.padEnd(10)}; actual purchase: ${actualPurchaseFormatted.padEnd(10)}; difference=${formatCurrency(diff)}; txID=${transaction.id}; Customer=${transaction.data.customerDetails.company}; Partner=${transaction.data.partnerDetails?.partnerName}; ${notes.join('; ')}`);
            console.log(`Pricing opts: `);
            console.dir(pricingOpts, { depth: 1 });

            console.log(`npm run add-transaction-adjustment -- ${transaction.id} ${diff.toFixed(2)} ""\n\n`);
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

            return { valid, notes: ['Japan sales priced in JPY are allowed drift'] };
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

        if (purchasePrice===0) {
            return [];
        }

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
        adjustment.notes = `Automatic reseller discount of ${discountAmount*100}% (${formatCurrency(purchasePriceDiscount)}) for ${resellerName}`;

        return [adjustment];
    }

    private async calculateExpectedDiscountForTransaction(transaction: Transaction) : Promise<DiscountResult> {
        // Check to see if we expect any reseller adjustments for this transaction

        const expectedAdjustments = await this.generateExpectedAdjustments(transaction);
        const actualAdjustments = await this.getActualAdjustments(transaction);

        // If any adjustments were actually persisted to the database, use those. If not,
        // generate the adjustments we expect (such as reseller discounts).

        const shouldApplyActualAdjustments = actualAdjustments.length > 0;
        const adjustmentsToApply = shouldApplyActualAdjustments ? actualAdjustments : expectedAdjustments;
        const expectedDiscount = adjustmentsToApply.reduce((acc, adjustment) => acc + (adjustment.purchasePriceDiscount || 0), 0);

        return {
            discountToUse: expectedDiscount,
            hasExpectedAdjustments: expectedAdjustments.length > 0,
            hasActualAdjustments: actualAdjustments.length > 0,
            adjustmentNotes: adjustmentsToApply.map(a => a.notes).filter(n => typeof n !== 'undefined')
        };
    }
}
