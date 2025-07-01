import { inject, injectable } from "inversify";
import { ValidationOptions } from "./types";
import { TransactionValidationResult } from "./types";
import { deploymentTypeFromHosting } from "#common/util/validationUtils";
import { Transaction } from "#common/entities/Transaction";
import { PricingTierResult } from "#common/types/pricingTierResult";
import { PricingService } from "#server/services/PricingService";
import { PriceCalculatorService } from "#server/services/PriceCalculatorService";
import { PriceWithPricingOpts } from "./types";
import { MAX_JPY_DRIFT } from "./constants";
import { TYPES } from "#server/config/types";
import { getLicenseDurationInDays } from "#common/util/licenseDurationCalculator";
import { isSignificantlyDifferent } from "#common/util/significantDifferenceTester";
import { PriceCalcOpts, PriceResult } from '#server/services/types';
import { AddonDao } from "../../database/dao/AddonDao";
import { sumDiscountArrayForTransaction } from "#common/util/transactionDiscounts";

@injectable()
export class TransactionValidator {
    constructor(
        @inject(TYPES.PricingService) private pricingService: PricingService,
        @inject(TYPES.PriceCalculatorService) private priceCalculatorService: PriceCalculatorService,
        @inject(TYPES.AddonDao) private addonDao: AddonDao
    ) {}

    /**
     * Given a single transaction, and with directions as to whether or not to use legacy pricing for that
     * transaction (or the one it is upgrading), validate if the price is correct.
     */
    public async validateOneTransaction(opts: ValidationOptions): Promise<TransactionValidationResult> {
        const {
            transaction,
            useLegacyPricingTierForCurrent,
            useLegacyPricingTierForPrevious,
            expectedDiscount,
            hasActualAdjustments,
            isSandbox,
            previousPurchaseFindResult,
            expectedDiscountForPreviousPurchase
        } = opts;
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
        const parentProduct = await this.addonDao.getParentProductForApp(addonKey);

        // If it is an upgrade, we need to also load details about the previous purchase and potentially-different
        // pricing tiers for that transaction.

        let previousPurchase : Transaction | undefined;
        let previousPurchasePricingTierResult : PricingTierResult | undefined;
        let previousPurchaseEffectiveMaintenanceEndDate : string | undefined;

        if ((saleType==='Upgrade' || saleType==='Downgrade' || saleType==='Renewal') && previousPurchaseFindResult) {
            previousPurchase = previousPurchaseFindResult.transaction;
            const { effectiveMaintenanceEndDate } = previousPurchaseFindResult;

            if (effectiveMaintenanceEndDate) {
                previousPurchaseEffectiveMaintenanceEndDate = effectiveMaintenanceEndDate;
            }

            const { saleDate: previousSaleDate } = previousPurchase.data.purchaseDetails;
            previousPurchasePricingTierResult = await this.pricingService.getPricingTiers({ addonKey, deploymentType, saleDate: previousSaleDate });
        }

        // Calculate the expected price for the previous transaction, if it exists. The previous transaction is
        // only relevant to pricing if we are performing an upgrade, since the prior license cost then comes into play
        // if there are overlapping maintenance periods.

        const previousPurchasePricing =
                    (saleType==='Upgrade' || saleType==='Downgrade') && previousPurchase && previousPurchasePricingTierResult && typeof expectedDiscountForPreviousPurchase !== 'undefined'
                        ? this.calculatePriceForTransaction({ transaction: previousPurchase, isSandbox: false, pricingTierResult: previousPurchasePricingTierResult, useLegacyPricingTier: useLegacyPricingTierForPrevious, expectedDiscount: expectedDiscountForPreviousPurchase.discountToUse, previousPurchaseEffectiveMaintenanceEndDate: undefined, parentProduct })
                        : undefined;

        // Calculate the expected price for the current transaction.

        const { price, pricingOpts } = this.calculatePriceForTransaction({ transaction, isSandbox, pricingTierResult: pricingTierResult, previousPurchase, previousPricing: previousPurchasePricing?.price, useLegacyPricingTier: useLegacyPricingTierForCurrent, expectedDiscount, previousPurchaseEffectiveMaintenanceEndDate, parentProduct });

        let expectedVendorAmount = price.vendorPrice;

        // Now compare the prices and see if the actual price is what we expect.

        let { valid, notes } = this.isPriceValid({ vendorAmount, expectedVendorAmount, country: transaction.data.customerDetails.country });
        const isExpectedPrice = valid;

        // Also validate the start/end dates of the license
        const licenseDurationInDays = getLicenseDurationInDays(maintenanceStartDate, maintenanceEndDate);
        const { licenseType } = purchaseDetails;

        // Check for continuity for upgrade and renewal transactions. Community licenses are exempt because they are free anyway.

        if ((saleType==='Upgrade' || saleType==='Renewal' || saleType==='Downgrade') && licenseDurationInDays !== 0  && licenseType !== 'COMMUNITY') {
            if (!previousPurchase) {
                notes.push('This is an upgrade/downgrade/renewal, but we could not find related transaction for previous purchase');
                valid = false;
            } else {
                const { maintenanceEndDate: priorMaintenanceEndDate } = previousPurchase?.data.purchaseDetails;

                if (priorMaintenanceEndDate < maintenanceStartDate) {
                    // Upgrades: must start at or before end of previous maintenance
                    notes.push(`Maintenance gap: upgrade must start at or before end of previous maintenance: previous maintenance ended on ${priorMaintenanceEndDate} but this license starts on ${maintenanceStartDate}`);
                    valid = false;
                } else if (saleType==='Downgrade' && maintenanceStartDate < priorMaintenanceEndDate) {
                    // Downgrades: must NOT start before end of previous maintenance
                    notes.push(`Maintenance gap: downgrade must not start before end of previous maintenance: this license starts on ${maintenanceStartDate} but it downgrades a previous license ending on ${priorMaintenanceEndDate}`);
                    valid = false;
                }
                else if (saleType==='Renewal' && maintenanceStartDate !== priorMaintenanceEndDate) {
                    // Renewals: must start on the same day as the previous maintenance
                    notes.push(`Maintenance gap: renewal must have same start date as previous maintenance: this license starts on ${maintenanceStartDate} but it renews a previous license ending on ${priorMaintenanceEndDate}`);
                    valid = false;
                }
            }
        }

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
        parentProduct: string;
    }) : PriceWithPricingOpts {
        const {
            transaction,
            isSandbox,
            pricingTierResult,
            previousPricing,
            useLegacyPricingTier,
            expectedDiscount,
            previousPurchaseEffectiveMaintenanceEndDate,
            parentProduct
        } = opts;
        const { purchaseDetails } = transaction.data;

        // Sum the partner discount from the discounts array
        const declaredPartnerDiscount = sumDiscountArrayForTransaction( { data: transaction.data, type: 'EXPERT' });

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
            declaredPartnerDiscount,
            discounts: purchaseDetails.discounts,
            parentProduct
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

    isPriceValid(opts: { expectedVendorAmount: number; vendorAmount: number; country: string; }) : { valid: boolean; notes: string[] } {
        const { expectedVendorAmount, vendorAmount, country } = opts;

        if (country==='Japan') {
            const valid = vendorAmount >= expectedVendorAmount*(1-MAX_JPY_DRIFT) &&
                vendorAmount <= expectedVendorAmount*(1+MAX_JPY_DRIFT) &&
                !(vendorAmount===0 && expectedVendorAmount > 0);

            return { valid, notes: [`Japan sales priced in JPY are allowed drift of up to ${MAX_JPY_DRIFT*100}%`] };
        }

        const valid =
            !isSignificantlyDifferent(vendorAmount, expectedVendorAmount) &&
            !(vendorAmount===0 && expectedVendorAmount > 0);

        return { valid, notes: [] };
    }
}