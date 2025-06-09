import { Transaction } from '#common/entities/Transaction';
import { PricingService } from './PricingService';
import { components } from '#common/types/marketplace-api';
import { deploymentTypeFromHosting } from '#common/utils/validationUtils';
import { PriceCalcOpts, PriceCalculatorService, PriceResult } from './PriceCalculatorService';
import { inject, injectable } from 'inversify';
import { TYPES } from '../config/types';
import { LicenseDao } from '../database/LicenseDao';
import { formatCurrency } from '#common/utils/formatCurrency';
import { ResellerDao } from '../database/ResellerDao';
import { TransactionAdjustment } from '#common/entities/TransactionAdjustment';
import { TransactionAdjustmentDao } from '../database/TransactionAdjustmentDao';
import { getLicenseDurationInDays } from '#common/utils/licenseDurationCalculator';
import { PricingTierResult } from '#common/types/pricingTierResult';
import { PreviousTransactionService } from './PreviousTransactionService';
import { TransactionVersion } from '#common/entities/TransactionVersion';
import { dateDiff } from '#common/utils/dateUtils';
import { Pricing } from '#common/entities/Pricing';

const MAX_JPY_DRIFT = 0.15; // Atlassian generally allows a 15% buffer for Japanese Yen transactions

// Do not reconcile automatically if legacy price used this late:
// Allow for at least 60-day grandfathering, 90-day quote, 30-day purchase
const ALERT_DAYS_AFTER_PRICING_CHANGE = 180;

export type PurchaseDetails = components['schemas']['TransactionPurchaseDetails'];

interface PriceWithPricingOpts {
    price: PriceResult;
    pricingOpts: PriceCalcOpts;
}

export interface TransactionValidationResult {
    isExpectedPrice: boolean;
    valid: boolean;
    vendorAmount: number;
    price: PriceResult;
    expectedVendorAmount: number;
    notes: string[];
    pricingOpts: PriceCalcOpts;
    legacyPricingEndDate: string|undefined;
    previousPurchaseLegacyPricingEndDate: string|undefined;
    useLegacyPricingTierForCurrent: boolean;
    expectedDiscountApplied: number;
    hasActualAdjustments: boolean;
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

// Are these right?!
const PARTNER_DISCOUNT_PERMUTATIONS_FOR_CLOUD : number[] = [
    0.10,
    0.05,
    0.00
];

// Are these right?!
const PARTNER_DISCOUNT_PERMUTATIONS_FOR_DATACENTER : number[] = [
    0.25,
    0.20,
    0.10,
    0.00
];

const PARTNER_DISCOUNT_PERMUTATIONS_FOR_OPT_OUT : number[] = [
    0.00
];

interface ValidationOptions {
    transaction: Transaction;
    useLegacyPricingTierForCurrent: boolean;
    useLegacyPricingTierForPrevious: boolean;
    expectedDiscount: number;
    hasActualAdjustments: boolean;
    partnerDiscountFraction: number;
}

@injectable()
export class TransactionValidationService {
    constructor(
        @inject(TYPES.PricingService) private pricingService: PricingService,
        @inject(TYPES.PriceCalculatorService) private priceCalculatorService: PriceCalculatorService,
        @inject(TYPES.LicenseDao) private licenseDao: LicenseDao,
        @inject(TYPES.ResellerDao) private resellerDao: ResellerDao,
        @inject(TYPES.TransactionAdjustmentDao) private transactionAdjustmentDao: TransactionAdjustmentDao,
        @inject(TYPES.PreviousTransactionService) private previousTransactionService: PreviousTransactionService,
    ) {
    }

    public async transactionValidator(transaction: Transaction) : Promise<TransactionValidationResult|undefined> {
        const discountResult = await this.calculateFinalExpectedDiscountForTransaction(transaction);
        const validationResult = await this.validateOneTransactionWithPricingPermutations({ transaction, discountResult });
        return this.applyPostValidationRules({ transaction, validationResult });
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

        const pricing = await this.getPricingForTransaction(transaction);

        const legacyPricePermutations = transaction.data.purchaseDetails.saleType === 'Upgrade'
                                            ? LEGACY_PRICING_PERMUTATIONS_WITH_UPGRADE
                                            : LEGACY_PRICING_PERMUTATIONS_NO_UPGRADE;

        const partnerDiscountFractionPermutations = pricing.expertDiscountOptOut                           ? PARTNER_DISCOUNT_PERMUTATIONS_FOR_OPT_OUT
                                            : transaction.data.purchaseDetails.hosting === 'Cloud' ? PARTNER_DISCOUNT_PERMUTATIONS_FOR_CLOUD
                                                                                                   : PARTNER_DISCOUNT_PERMUTATIONS_FOR_DATACENTER;

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
                const { hasActualAdjustments } = discountResult;

                for (const partnerDiscountFraction of partnerDiscountFractionPermutations) {

                    // Try to see if the price matches with this permutation of legacy pricing (or not)

                    validationResult = await this.validateOneTransaction({
                        transaction,
                        useLegacyPricingTierForCurrent,
                        useLegacyPricingTierForPrevious,
                        expectedDiscount: useExpectedDiscount ? discountToUse : 0,
                        hasActualAdjustments,
                        partnerDiscountFraction
                    });

                    const { isExpectedPrice, notes } = validationResult;

                    if (isExpectedPrice) {
                        if (useLegacyPricingTierForCurrent) {
                            const { saleDate } = transaction.data.purchaseDetails;
                            const { legacyPricingEndDate } = validationResult;

                            notes.push(`Price is correct but uses legacy pricing for current transaction (sold on ${saleDate}, but prior pricing ended on ${legacyPricingEndDate})`);
                        }

                        if (useLegacyPricingTierForPrevious) {
                            notes.push(`Price is correct but uses legacy pricing for previous transaction`);
                        }

                        if (partnerDiscountFraction > 0) {
                            notes.push(`Price is correct but assumes Solutions Partner discount of ${partnerDiscountFraction*100}%`);
                        }

                        if (useExpectedDiscount) {
                            discountResult.adjustmentNotes.forEach(n => {
                                if (discountResult.hasActualAdjustments) {
                                    notes.push(`Reconciled using manual adjustment: ${n}`);
                                } else {
                                    // Otherwise, these are expected discounts, so just add the message directly.
                                    notes.push(n);
                                }
                            });
                        } else {
                            notes.push(`Price is correct but expected discount of ${formatCurrency(discountToUse)} was not applied`);
                        }
                    }

                    // Now return early if we find the expected price

                    if (isExpectedPrice) {
                        return validationResult;
                    }
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
        const { transaction, useLegacyPricingTierForCurrent, useLegacyPricingTierForPrevious, expectedDiscount, hasActualAdjustments, partnerDiscountFraction } = opts;
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
                expectedDiscountForPreviousPurchase = await this.calculateFinalExpectedDiscountForTransaction(previousPurchase);
            }
        }

        // Calculate the expected price for the previous purchase, if it exists.

        const previousPricing = saleType==='Upgrade' && previousPurchase && previousPurchasePricingTierResult && typeof expectedDiscountForPreviousPurchase !== 'undefined'
                        ? this.calculatePriceForTransaction({ transaction: previousPurchase, isSandbox: false, pricingTierResult: previousPurchasePricingTierResult, useLegacyPricingTier: useLegacyPricingTierForPrevious, expectedDiscount: expectedDiscountForPreviousPurchase.discountToUse, previousPurchaseEffectiveMaintenanceEndDate: undefined, partnerDiscountFraction })
                        : undefined;

        // Calculate the expected price for the current transaction.

        const { price, pricingOpts } = this.calculatePriceForTransaction({ transaction, isSandbox, pricingTierResult: pricingTierResult, previousPurchase, previousPricing: previousPricing?.price, useLegacyPricingTier: useLegacyPricingTierForCurrent, expectedDiscount, previousPurchaseEffectiveMaintenanceEndDate, partnerDiscountFraction });

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

        const result : TransactionValidationResult = {
            isExpectedPrice,
            valid,
            vendorAmount,
            expectedVendorAmount,
            expectedDiscountApplied: expectedDiscount,
            notes,
            price,
            pricingOpts,
            legacyPricingEndDate: pricingTierResult.priorPricingEndDate,
            previousPurchaseLegacyPricingEndDate: previousPurchasePricingTierResult?.priorPricingEndDate,
            useLegacyPricingTierForCurrent,
            hasActualAdjustments
        };

        return result;
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
        partnerDiscountFraction: number;
    }) : PriceWithPricingOpts {
        const {
            transaction,
            isSandbox,
            pricingTierResult,
            previousPricing,
            useLegacyPricingTier,
            expectedDiscount,
            previousPurchaseEffectiveMaintenanceEndDate,
            partnerDiscountFraction
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
            expectedDiscount,
            partnerDiscountFraction
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

    /**
     * If we have a defined set of resellers with individual discounts, generate the expected adjustments that
     * correspond to their discount.
     */
    private async generateExpectedAdjustmentsForPromoCodes(transaction: Transaction) : Promise<TransactionAdjustment[]> {
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

    /**
     * Get the set of expected discounts to be applied to the transaction, which consist
     * of automatically-calculated discounts for specific resellers, plus actual
     * adjustments that have been manually applied to the database.
     *
     * If we have actual adjustments in the database, these override any expected
     * discounts we have calculated and we use only the actual adjustments instead.
     */
    private async calculateFinalExpectedDiscountForTransaction(transaction: Transaction) : Promise<DiscountResult> {
        // Check to see if we expect any reseller adjustments for this transaction

        const expectedAdjustments = await this.generateExpectedAdjustmentsForPromoCodes(transaction);
        const actualAdjustments = await this.transactionAdjustmentDao.getAdjustmentsForTransaction(transaction);

        // If any adjustments were actually persisted to the database, use those. If not,
        // generate the adjustments we expect (such as reseller discounts).

        const shouldApplyActualAdjustments = actualAdjustments.length > 0;
        const adjustmentsToApply = shouldApplyActualAdjustments ? actualAdjustments : expectedAdjustments;
        const discountToUse = adjustmentsToApply.reduce((acc, adjustment) => acc + (adjustment.purchasePriceDiscount || 0), 0);
        const hasActualAdjustments = actualAdjustments.length > 0;

        return {
            discountToUse,
            hasExpectedAdjustments: expectedAdjustments.length > 0,
            hasActualAdjustments,
            adjustmentNotes: adjustmentsToApply
                .map(a => hasActualAdjustments ? `${formatCurrency(a.purchasePriceDiscount)} (${a.notes})` : a.notes)
                .filter((n): n is string => typeof n === 'string')
        };
    }

    /**
     * Test to see if any important fields have been updated, and if so, add notes
     * indicating why it should be unreconciled. If no notes are returned, we are
     * not requesting an unreconciliation.
     *
     */
    public async generateNotesIfTransactionHasImportantMutations(opts: { transaction: Transaction; priorVersion: TransactionVersion; validationResult: TransactionValidationResult; }) : Promise<string[]> {
        const { transaction, priorVersion } = opts;

        const currentData = transaction.data;
        const priorData = priorVersion.data;

        const notes : string[] = [];

        if (currentData.purchaseDetails.purchasePrice !== priorData.purchaseDetails.purchasePrice) {
            notes.push('Unreconciling because purchase price has changed from ${formatCurrency(priorData.purchaseDetails.purchasePrice)} to ${formatCurrency(currentData.purchaseDetails.purchasePrice)}');
        }

        if (currentData.purchaseDetails.maintenanceStartDate !== priorData.purchaseDetails.maintenanceStartDate) {
            notes.push(`Unreconciling because maintenance start date has changed from ${priorData.purchaseDetails.maintenanceStartDate} to ${currentData.purchaseDetails.maintenanceStartDate}`);
        }

        if (currentData.purchaseDetails.maintenanceEndDate !== priorData.purchaseDetails.maintenanceEndDate) {
            notes.push(`Unreconciling because maintenance end date has changed from ${priorData.purchaseDetails.maintenanceEndDate} to ${currentData.purchaseDetails.maintenanceEndDate}`);
        }

        if (currentData.purchaseDetails.hosting !== priorData.purchaseDetails.hosting) {
            notes.push(`Unreconciling because hosting has changed from ${priorData.purchaseDetails.hosting} to ${currentData.purchaseDetails.hosting}`);
        }

        if (currentData.purchaseDetails.licenseType !== priorData.purchaseDetails.licenseType) {
            notes.push(`Unreconciling because license type has changed from ${priorData.purchaseDetails.licenseType} to ${currentData.purchaseDetails.licenseType}`);
        }

        if (currentData.purchaseDetails.tier !== priorData.purchaseDetails.tier) {
            notes.push(`Unreconciling because tier has changed from ${priorData.purchaseDetails.tier} to ${currentData.purchaseDetails.tier}`);
        }

        if (currentData.purchaseDetails.billingPeriod !== priorData.purchaseDetails.billingPeriod) {
            notes.push(`Unreconciling because billing period has changed from ${priorData.purchaseDetails.billingPeriod} to ${currentData.purchaseDetails.billingPeriod}`);
        }

        // TODO FIXME:  this is a test to see if we can unreconcile transactions using commonly-updated but
        // unimportant fields.
        if (currentData.lastUpdated !== priorData.lastUpdated) {
            notes.push(`Unreconciling because last updated date has changed from ${priorData.lastUpdated} to ${currentData.lastUpdated}`);
        }

        return notes;
    }

    /**
     * Rules to apply after finding the final price.
     */
    public async applyPostValidationRules(opts: { transaction: Transaction; validationResult: TransactionValidationResult|undefined; }) : Promise<TransactionValidationResult|undefined> {
        const { transaction, validationResult } = opts;

        if (!validationResult) {
            return undefined;
        }

        const { useLegacyPricingTierForCurrent, legacyPricingEndDate } = validationResult;

        if (useLegacyPricingTierForCurrent && legacyPricingEndDate) {
            const days = dateDiff(legacyPricingEndDate, transaction.data.purchaseDetails.saleDate);

            // This test is not inlined with the main cehck for legacy pricing because we want to be able to sleuth out
            // the correct permutation of legacy/non-legacy and discount/no-discount pricing, but we still want to
            // alert if legacy pricing is still in force after the pricing change date.

            if (days > ALERT_DAYS_AFTER_PRICING_CHANGE) {
                validationResult.notes.push(`Legacy pricing was still applied more than ${ALERT_DAYS_AFTER_PRICING_CHANGE} days after pricing change on ${legacyPricingEndDate}`);
                validationResult.valid = false;
            }
        }

        return validationResult;
    }

    private async getPricingForTransaction(transaction: Transaction) : Promise<Pricing> {
        const { addonKey, purchaseDetails } = transaction.data;
        const {
            saleDate,
        } = purchaseDetails;

        const deploymentType = deploymentTypeFromHosting(purchaseDetails.hosting);
        const pricing = await this.pricingService.getPricing({ addonKey, deploymentType, saleDate });

        if (!pricing) {
            throw new Error(`No pricing found for ${addonKey} on ${saleDate}`);
        }

        return pricing;
    }
}
