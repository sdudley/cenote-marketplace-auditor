import { Transaction } from '@common/entities/Transaction';
import { PricingService } from '../services/PricingService';
import { components } from '@common/types/marketplace-api';
import { deploymentTypeFromHosting } from '@common/utils/validationUtils';
import { PriceCalcOpts, PriceCalculatorService, PriceResult } from '../services/PriceCalculatorService';
import { inject, injectable } from 'inversify';
import { TYPES } from '../config/types';
import TransactionDao from '../database/TransactionDao';
import TransactionReconcileDao from '../database/TransactionReconcileDao';
import { LicenseDao } from '../database/LicenseDao';
import { formatCurrency } from '@common/utils/formatCurrency';
import { ResellerDao } from '../database/ResellerDao';
import { TransactionAdjustment } from '@common/entities/TransactionAdjustment';
import { TransactionAdjustmentDao } from '../database/TransactionAdjustmentDao';
import { getLicenseDurationInDays } from '@common/utils/licenseDurationCalculator';
import { PricingTierResult } from '@common/types/pricingTierResult';
import { PreviousTransactionService } from '../services/PreviousTransactionService';

const DEFAULT_START_DATE = '2024-01-01';
const MAX_JPY_DRIFT = 0.15; // Atlassian generally allows a 15% buffer for Japanese Yen transactions

// TODO: evaluate licenses against transactions
// License end dates that extend those of transactions (see SQL queries)
// License sizes that do not match transaction sizes

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

interface ValidationOptions {
    transaction: Transaction;
    useLegacyPricingTierForCurrent: boolean;
    useLegacyPricingTierForPrevious: boolean;
    expectedDiscount: number;
}

@injectable()
export class ValidationJob {
    constructor(
        @inject(TYPES.PricingService) private pricingService: PricingService,
        @inject(TYPES.PriceCalculatorService) private priceCalculatorService: PriceCalculatorService,
        @inject(TYPES.TransactionDao) private transactionDao: TransactionDao,
        @inject(TYPES.TransactionReconcileDao) private transactionReconcileDao: TransactionReconcileDao,
        @inject(TYPES.LicenseDao) private licenseDao: LicenseDao,
        @inject(TYPES.ResellerDao) private resellerDao: ResellerDao,
        @inject(TYPES.TransactionAdjustmentDao) private transactionAdjustmentDao: TransactionAdjustmentDao,
        @inject(TYPES.PreviousTransactionService) private previousTransactionService: PreviousTransactionService
    ) {
    }

    /**
     * Validate all transactions in the database
     * @param startDate Optional start date to filter transactions
     */
    async validateTransactions(startDate?: string|null): Promise<void> {
        const actualStartDate = startDate ?? DEFAULT_START_DATE;
        const transactions = await this.transactionDao.getTransactionsBySaleDate(actualStartDate);

        console.log(`\n=== Validating transactions since ${actualStartDate} ===`);

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

    /**
     * Attempt to validate the price for a transaction.
     *
     * For a given transaction, we do not know if it was sold with legacy pricing or not, and same for the
     * transaction from which it was being upgraded (which also impacts the current transaction's sales price).
     * To account for these scenarios, we try all possible permutations of legacy pricing (or not) for both
     * transactions. Additionally, the transaction may have been sold with or without a discount, so we try
     * those permutations as well.
     */
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

    /**
     * Given a single transaction, and with directions as to whether or not to use legacy pricing for that
     * transaction (or the one it is upgrading), validate if the price is correct.
     */
    private async validateOneTransaction(opts: ValidationOptions): Promise<TransactionValidationResult> {
        const { transaction, useLegacyPricingTierForCurrent, useLegacyPricingTierForPrevious, expectedDiscount } = opts;
        const { data } = transaction;
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
        let previousPurchaseEffectiveMaintenanceEndDate : string | undefined;

        if (saleType==='Upgrade' || saleType==='Renewal') {
            const previousPurchaseResult = await this.previousTransactionService.findPreviousTransaction(transaction);

            if (previousPurchaseResult) {
                previousPurchase = previousPurchaseResult.transaction;
                const { effectiveMaintenanceEndDate } = previousPurchaseResult;

                if (effectiveMaintenanceEndDate) {
                    previousPurchaseEffectiveMaintenanceEndDate = effectiveMaintenanceEndDate;
                }

                const { saleDate: previousSaleDate } = previousPurchase.data.purchaseDetails;
                previousPurchasePricingTierResult = await this.pricingService.getPricingTiers({ addonKey, deploymentType, saleDate: previousSaleDate });
                expectedDiscountForPreviousPurchase = await this.calculateExpectedDiscountForTransaction(previousPurchase);
            }
        }

        // Calculate the expected price for the previous purchase, if it exists.

        const previousPricing = saleType==='Upgrade' && previousPurchase && previousPurchasePricingTierResult && typeof expectedDiscountForPreviousPurchase !== 'undefined'
                        ? this.calculatePriceForTransaction({ transaction: previousPurchase, isSandbox: false, pricingTierResult: previousPurchasePricingTierResult, useLegacyPricingTier: useLegacyPricingTierForPrevious, expectedDiscount: expectedDiscountForPreviousPurchase.discountToUse, previousPurchaseEffectiveMaintenanceEndDate: undefined  })
                        : undefined;

        // Calculate the expected price for the current transaction.

        const { price, pricingOpts } = this.calculatePriceForTransaction({ transaction, isSandbox, pricingTierResult: pricingTierResult, previousPurchase, previousPricing: previousPricing?.price, useLegacyPricingTier: useLegacyPricingTierForCurrent, expectedDiscount, previousPurchaseEffectiveMaintenanceEndDate });

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

        // if (saleType==='Refund') {
        //     notes.push('Refund requires manual approval');
        //     valid = false;
        // }

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

        const existingReconcile = await this.transactionReconcileDao.getTransactionReconcileForTransaction(transaction);

        // Don't re-reconcile if no new version has been created

        if (existingReconcile && existingReconcile.transactionVersion===transaction.currentVersion) {
            return;
        }

        // Record the reconcile record

        await this.transactionReconcileDao.recordReconcile({ transaction, existingReconcile, valid, notes, vendorAmount, expectedVendorAmount });
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
            //console.log(`OK      ${saleDate} ${saleType.padEnd(7)} L=${entitlementId.padEnd(17)} Expected vendor: ${expectedVendorFormatted.padEnd(10)}; actual vendor: ${actualVendorFormatted.padEnd(10)} ${notes.join('; ')}`);
        } else {
            const diff = expectedPurchase - actualPurchase;
            console.log(`*ERROR* ${saleDate} ${saleType.padEnd(7)} L=${entitlementId.padEnd(17)} Expected vendor: ${expectedVendorFormatted.padEnd(10)}; actual vendor: ${actualVendorFormatted.padEnd(10)}; expected purchase: ${expectedPurchaseFormatted.padEnd(10)}; actual purchase: ${actualPurchaseFormatted.padEnd(10)}; difference=${formatCurrency(diff)}; txID=${transaction.id}; Customer=${transaction.data.customerDetails.company}; Partner=${transaction.data.partnerDetails?.partnerName}; ${notes.join('; ')}`);
            // console.debug(`Pricing opts: `);
            // console.dir(pricingOpts, { depth: 1 });

            console.log(`To accept adjustment: npm run add-transaction-adjustment -- ${transaction.id} ${diff.toFixed(2)} ""\n\n`);
        }
    }

    // Returns true if the transaction represents a sandbox instance

    private async isSandbox(opts: { vendorAmount: number; transaction: Transaction }) : Promise<boolean> {
        const { vendorAmount, transaction } = opts;

        if (vendorAmount !== 0) {
            return false;
        }

        const license = await this.licenseDao.loadLicenseForTransaction(transaction);

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
        previousPurchaseEffectiveMaintenanceEndDate: string|undefined;
        expectedDiscount: number;
    }) : PriceWithPricingOpts {
        const {
            transaction,
            isSandbox,
            pricingTierResult,
            previousPricing,
            useLegacyPricingTier,
            expectedDiscount,
            previousPurchaseEffectiveMaintenanceEndDate
        } = opts;
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
            previousPurchaseMaintenanceEndDate: previousPurchaseEffectiveMaintenanceEndDate,
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

    private async getActualAdjustments(transaction: Transaction) : Promise<TransactionAdjustment[]> {
        const adjustments = await this.transactionAdjustmentDao.getAdjustmentsForTransaction(transaction);
        return adjustments;
    }

    private async generateExpectedAdjustments(transaction: Transaction) : Promise<TransactionAdjustment[]> {
        const resellerName = transaction.data.partnerDetails?.partnerName;
        const reseller = await this.resellerDao.findMatchingReseller(resellerName);

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
            adjustmentNotes: adjustmentsToApply
                .map(a => a.notes)
                .filter((n): n is string => typeof n === 'string')
        };
    }
}
