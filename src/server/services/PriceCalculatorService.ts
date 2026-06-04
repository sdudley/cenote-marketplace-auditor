import { getLicenseDurationInDays, getSubscriptionOverlapDays, getMonthsInDateRange, getDaysInDateRangeForMonth } from "#common/util/licenseDurationCalculator.js";
import { UserTierPricing } from '#common/types/userTiers.js';
import { deploymentTypeFromHosting, userCountFromTier } from "#common/util/validationUtils.js";
import {
    ACADEMIC_CLOUD_PRICE_RATIO,
    ACADEMIC_DC_PRICE_RATIO_CURRENT_CONF_10K,
    ACADEMIC_DC_PRICE_RATIO_CURRENT_OTHER,
    ACADEMIC_DC_PRICE_RATIO_CURRENT_START_DATE,
    ACADEMIC_DC_PRICE_RATIO_LEGACY,
    CLOUD_DISCOUNT_RATIO,
    COMMUNITY_CLOUD_PRICE_RATIO,
    DC_DISCOUNT_RATIO,
    SOCIAL_IMPACT_GLOBAL_ACCESS_CLOUD_PRICE_RATIO
} from "#server/util/validationConstants.js";
import { injectable } from "inversify";
import { DeploymentType, EnhancedLicenseType, HostingType } from "#common/types/marketplace.js";
import { PriceCalcDescriptor, PriceCalcOpts, PriceResult } from '#server/services/types.js';
import { TransactionMonthlyApportionmentEntry } from '#common/types/transactionPricing.js';
import { formatCurrency } from "#common/util/formatCurrency.js";
import { isDiscountedLicenseType, isCommunityLicense } from "#server/util/communityLicense.js";
import { isoStringWithOnlyDate } from "#common/util/dateUtils.js";
import { hasProratedDetails } from "#common/util/mqbUtils.js";

const ANNUAL_DISCOUNT_MULTIPLIER = 10; // 12 months for the price of 10 months

/** Days in billing month used for MQB proration (vendor convention) */
const MQB_BILLING_MONTH_DAYS = 31;
const CLOUD_DISCOUNT_RATIO_CHANGE_DATE = '2026-04-01';
const CLOUD_DISCOUNT_RATIO_FOR_NON_FORGE = 0.8;


/** Result of the core pricing step (MQB or regular) before refund/academic/discounts/finalization. */
interface CorePriceResult {
    basePrice: number;
    descriptors: PriceCalcDescriptor[];
    licenseDurationDays: number;
    userCount: number;
}

@injectable()
export class PriceCalculatorService {
    private getDiscountAmount(opts: {
        saleDate: string;
        deploymentType: DeploymentType;
        forgeMigrationDate?: string | null;
        alwaysForge?: boolean;
    }): number {
        const { saleDate, deploymentType, forgeMigrationDate, alwaysForge } = opts;

        if (deploymentType !== 'cloud') {
            return DC_DISCOUNT_RATIO;
        }

        if (saleDate < CLOUD_DISCOUNT_RATIO_CHANGE_DATE) {
            return CLOUD_DISCOUNT_RATIO;
        }

        if (alwaysForge) {
            return CLOUD_DISCOUNT_RATIO;
        }

        if (forgeMigrationDate && forgeMigrationDate < saleDate) {
            return CLOUD_DISCOUNT_RATIO;
        }

        return CLOUD_DISCOUNT_RATIO_FOR_NON_FORGE;
    }

    public calculateExpectedPrice(opts: PriceCalcOpts): PriceResult {
        const { isFreeLicense, freeDescriptors } = this.isFreeLicense(opts);
        if (isFreeLicense) {
            return { vendorPrice: 0, purchasePrice: 0, dailyNominalPrice: 0, descriptors: freeDescriptors };
        }

        const deploymentType = deploymentTypeFromHosting(opts.hosting);
        const isMQB =
            deploymentType === 'cloud' &&
            opts.billingPeriod === 'Monthly' &&
            hasProratedDetails(opts.proratedDetails);

        const core = isMQB ? this.computeMQBCore(opts) : this.computeRegularCore(opts);
        let { basePrice, descriptors } = core;

        // Apply academic (and refund negation) before overlap so overlap uses the same discount basis as
        // previousPricing (prior period is already academic-adjusted); otherwise we would mix full current
        // price with discounted previous price in the overlap descriptor.
        ({ basePrice, descriptors } = this.applyRefundAndAcademicDiscounts(opts, basePrice, descriptors, core.userCount));

        let purchasePrice: number;
        const { billingPeriod, hosting, saleType, maintenanceStartDate, previousPurchaseMaintenanceEndDate } = opts;

        if (billingPeriod === 'Annual' && basePrice != Math.ceil(basePrice)) {
            descriptors.push({ subtotal: Math.ceil(basePrice), description: `Round to integer for annual billing` });
        }
        purchasePrice = billingPeriod === 'Annual' ? Math.ceil(basePrice) : basePrice;

        // Overlap adjustment (upgrade/downgrade/refund): uses purchasePrice/dailyNominalPrice already adjusted for academic and refund.
        const dailyNominalPrice = core.licenseDurationDays === 0 ? 0 : purchasePrice / core.licenseDurationDays;

        if (!isMQB) {
            descriptors.push({
                description: `Daily nominal price = purchase price / days in license = ${formatCurrency(purchasePrice)} / ${core.licenseDurationDays} = ${formatCurrency(dailyNominalPrice)}`
            });

            const isOverlapRelevant = (saleType === 'Upgrade' || saleType === 'Downgrade' || saleType === 'Refund') && previousPurchaseMaintenanceEndDate;
            if (isOverlapRelevant) {
                const { previousPricing } = opts;
                const overlapDays = getSubscriptionOverlapDays(maintenanceStartDate, previousPurchaseMaintenanceEndDate);
                if (overlapDays > core.licenseDurationDays) {
                    throw new Error('Overlap days are greater than the license duration');
                }
                if (overlapDays > 0 && previousPricing && previousPricing.purchasePrice > 0) {
                    const newDays = core.licenseDurationDays - overlapDays;
                    const newPeriodPrice = dailyNominalPrice * newDays;
                    descriptors.push({
                        description: `Subscription has ${newDays} non-overlapping days at new license price (${formatCurrency(dailyNominalPrice)} * ${newDays}) = ${formatCurrency(newPeriodPrice)}`
                    });
                    // For Refund, dailyNominalPrice is already negative; overlap refund = (oldDaily - newDaily) * overlapDays.
                    // Use same descriptor text (positive current daily vs previous) for both; only the totals differ by sign.
                    const currentDailyForDisplay = saleType === 'Refund' ? Math.abs(dailyNominalPrice) : dailyNominalPrice;
                    const oldPeriodPricePerDayDisplay = currentDailyForDisplay - previousPricing.dailyNominalPrice;
                    const oldPeriodPricePerDay = saleType === 'Refund'
                        ? previousPricing.dailyNominalPrice - currentDailyForDisplay
                        : dailyNominalPrice - previousPricing.dailyNominalPrice;
                    const oldPeriodPrice = oldPeriodPricePerDay * overlapDays;
                    descriptors.push({
                        description: `Subscription overlaps ${overlapDays} days with old license, which are billed at ${formatCurrency(currentDailyForDisplay)} - ${formatCurrency(previousPricing.dailyNominalPrice)} = ${formatCurrency(oldPeriodPricePerDayDisplay)} per day, or ${formatCurrency(oldPeriodPrice)} total`
                    });
                    basePrice = oldPeriodPrice + newPeriodPrice;
                    purchasePrice = billingPeriod === 'Annual'
                        ? (basePrice > 0 ? Math.ceil(basePrice) : Math.floor(basePrice))
                        : basePrice;
                    const priceLabel = saleType === 'Refund' ? 'Final refund price (overlap-adjusted)' : 'Final upgrade price';
                    descriptors.push({ subtotal: basePrice, description: `${priceLabel} = ${formatCurrency(oldPeriodPrice)} + ${formatCurrency(newPeriodPrice)}` });
                }
            }
        }

        ({ basePrice, descriptors } = this.applyExpectedAndPartnerDiscounts(opts, basePrice, descriptors));

        if (billingPeriod === 'Annual') {
            if (basePrice != Math.ceil(basePrice)) {
                basePrice = basePrice > 0 ? Math.ceil(basePrice) : Math.floor(basePrice);
                descriptors.push({ subtotal: basePrice, description: `Round to integer for annual billing` });
            }
        }

        if (isMQB) {
            purchasePrice = Math.round(basePrice * 100) / 100;
        } else {
            purchasePrice = basePrice;
            if (billingPeriod === 'Annual' && hosting !== 'Cloud' && basePrice != Math.ceil(basePrice)) {
                basePrice = Math.ceil(basePrice);
                descriptors.push({ subtotal: basePrice, description: `Round again to integer for DC` });
            }
        }

        return this.finalizePriceResult(opts, basePrice, purchasePrice, dailyNominalPrice, descriptors);
    }

    /**
     * Apportions expected and actual vendor price across calendar months based on license days,
     * including overlap adjustments for upgrades/downgrades/refunds.
     */
    public calculateMonthlyPriceApportionment(opts: {
        pricingOpts: PriceCalcOpts;
        expectedVendorAmount: number;
        actualVendorAmount: number;
    }): TransactionMonthlyApportionmentEntry[] {
        const { pricingOpts, expectedVendorAmount, actualVendorAmount } = opts;
        const { maintenanceStartDate, maintenanceEndDate } = pricingOpts;
        const months = getMonthsInDateRange(maintenanceStartDate, maintenanceEndDate);

        if (months.length === 0) {
            return [];
        }

        const { isFreeLicense } = this.isFreeLicense(pricingOpts);
        if (isFreeLicense) {
            return months.map(month => ({ month, estimatedValue: 0, actualValue: 0 }));
        }

        const deploymentType = deploymentTypeFromHosting(pricingOpts.hosting);
        const isMQB =
            deploymentType === 'cloud' &&
            pricingOpts.billingPeriod === 'Monthly' &&
            hasProratedDetails(pricingOpts.proratedDetails);

        const monthlyWeights = isMQB
            ? this.computeMQBMonthlyWeights(pricingOpts)
            : this.computeRegularMonthlyWeights(pricingOpts);

        return this.scaleMonthlyWeightsToAmounts({
            monthlyWeights,
            expectedVendorAmount,
            actualVendorAmount
        });
    }

    private computeRegularMonthlyWeights(pricingOpts: PriceCalcOpts): Map<string, number> {
        const {
            maintenanceStartDate,
            maintenanceEndDate,
            billingPeriod,
            saleType,
            previousPurchaseMaintenanceEndDate,
            previousPricing
        } = pricingOpts;

        const core = this.computeRegularCore(pricingOpts);
        const { basePrice: academicAdjustedPrice } = this.applyRefundAndAcademicDiscounts(
            pricingOpts,
            core.basePrice,
            [],
            core.userCount
        );

        let purchasePrice = billingPeriod === 'Annual' ? Math.ceil(academicAdjustedPrice) : academicAdjustedPrice;
        const dailyNominalPrice = core.licenseDurationDays === 0 ? 0 : purchasePrice / core.licenseDurationDays;

        let overlapDailyRate = 0;
        let overlapEndDate: string | undefined;
        const isOverlapRelevant =
            (saleType === 'Upgrade' || saleType === 'Downgrade' || saleType === 'Refund') &&
            previousPurchaseMaintenanceEndDate;

        if (isOverlapRelevant && previousPricing && previousPricing.purchasePrice > 0) {
            const overlapDays = getSubscriptionOverlapDays(maintenanceStartDate, previousPurchaseMaintenanceEndDate);
            if (overlapDays > 0) {
                overlapEndDate = previousPurchaseMaintenanceEndDate;
                const currentDailyForDisplay = saleType === 'Refund' ? Math.abs(dailyNominalPrice) : dailyNominalPrice;
                overlapDailyRate = saleType === 'Refund'
                    ? previousPricing.dailyNominalPrice - currentDailyForDisplay
                    : dailyNominalPrice - previousPricing.dailyNominalPrice;
            }
        }

        const weights = new Map<string, number>();
        for (const month of getMonthsInDateRange(maintenanceStartDate, maintenanceEndDate)) {
            const totalDaysInMonth = getDaysInDateRangeForMonth(maintenanceStartDate, maintenanceEndDate, month);
            if (totalDaysInMonth === 0) {
                continue;
            }

            let overlapDaysInMonth = 0;
            if (overlapEndDate) {
                overlapDaysInMonth = getDaysInDateRangeForMonth(
                    maintenanceStartDate,
                    overlapEndDate,
                    month
                );
            }

            const nonOverlapDaysInMonth = totalDaysInMonth - overlapDaysInMonth;
            const monthWeight =
                overlapDaysInMonth * overlapDailyRate +
                nonOverlapDaysInMonth * dailyNominalPrice;

            weights.set(month, monthWeight);
        }

        return weights;
    }

    private computeMQBMonthlyWeights(pricingOpts: PriceCalcOpts): Map<string, number> {
        const { maintenanceEndDate, proratedDetails, maintenanceStartDate } = pricingOpts;
        const weights = new Map<string, number>();

        for (const segment of proratedDetails ?? []) {
            const addedUsers = segment.addedUsers ?? 0;
            const segmentStartRaw = segment.date ?? maintenanceStartDate;
            const segmentStart = isoStringWithOnlyDate(segmentStartRaw);

            if (addedUsers <= 0) {
                continue;
            }

            const daysInSegment = getLicenseDurationInDays(segmentStart, maintenanceEndDate);
            if (daysInSegment <= 0) {
                continue;
            }

            const core = this.computeMQBCore({
                ...pricingOpts,
                maintenanceStartDate: segmentStart,
                proratedDetails: [{ ...segment, date: segmentStart }]
            });
            const { basePrice: adjustedSegmentPrice } = this.applyRefundAndAcademicDiscounts(
                pricingOpts,
                core.basePrice,
                [],
                core.userCount
            );
            const segmentDailyRate = adjustedSegmentPrice / daysInSegment;

            for (const month of getMonthsInDateRange(segmentStart, maintenanceEndDate)) {
                const daysInMonth = getDaysInDateRangeForMonth(segmentStart, maintenanceEndDate, month);
                if (daysInMonth === 0) {
                    continue;
                }
                weights.set(month, (weights.get(month) ?? 0) + daysInMonth * segmentDailyRate);
            }
        }

        return weights;
    }

    private scaleMonthlyWeightsToAmounts(opts: {
        monthlyWeights: Map<string, number>;
        expectedVendorAmount: number;
        actualVendorAmount: number;
    }): TransactionMonthlyApportionmentEntry[] {
        const { monthlyWeights, expectedVendorAmount, actualVendorAmount } = opts;
        const months = [...monthlyWeights.keys()].sort();
        const totalWeight = months.reduce((sum, month) => sum + (monthlyWeights.get(month) ?? 0), 0);

        if (totalWeight === 0) {
            return months.map(month => ({ month, estimatedValue: 0, actualValue: 0 }));
        }

        const entries: TransactionMonthlyApportionmentEntry[] = months.map(month => {
            const fraction = (monthlyWeights.get(month) ?? 0) / totalWeight;
            return {
                month,
                estimatedValue: Math.round(fraction * expectedVendorAmount * 100) / 100,
                actualValue: Math.round(fraction * actualVendorAmount * 100) / 100
            };
        });

        this.adjustRoundedAmountRemainder(entries, 'estimatedValue', expectedVendorAmount);
        this.adjustRoundedAmountRemainder(entries, 'actualValue', actualVendorAmount);

        return entries;
    }

    private adjustRoundedAmountRemainder(
        entries: TransactionMonthlyApportionmentEntry[],
        field: 'estimatedValue' | 'actualValue',
        targetTotal: number
    ): void {
        if (entries.length === 0) {
            return;
        }

        const currentTotal = entries.reduce((sum, entry) => sum + entry[field], 0);
        const remainder = Math.round((targetTotal - currentTotal) * 100) / 100;
        if (remainder !== 0) {
            entries[entries.length - 1][field] =
                Math.round((entries[entries.length - 1][field] + remainder) * 100) / 100;
        }
    }

    // Used in tests to validate that we can correctly calculate annual pricing tiers

    generateCloudAnnualTierFromPerUserTier(opts: { perUserTiers: UserTierPricing[], annualTiers: UserTierPricing[] }): UserTierPricing[] {
        const { perUserTiers, annualTiers } = opts;

        const result : UserTierPricing[] = [];

        for (let i=0; i < annualTiers.length; i++) {
            const { userTier } = annualTiers[i];

            result.push({ userTier, cost: this.computeTierPrice({ userCount: userTier, perUserTiers }) * 10 });
        }

        return result;
    }

    /** Core pricing for non-MQB: base price and descriptors only (no refund/discounts/finalization). */
    private computeRegularCore(opts: PriceCalcOpts): CorePriceResult {
        const { pricingTierResult, tier, maintenanceStartDate, maintenanceEndDate, billingPeriod } = opts;
        const descriptors: PriceCalcDescriptor[] = [];
        const userCount = userCountFromTier(tier);
        const { tiers: pricingTiers } = pricingTierResult;
        const licenseDurationDays = getLicenseDurationInDays(maintenanceStartDate, maintenanceEndDate);
        const deploymentType = deploymentTypeFromHosting(opts.hosting);
        let basePrice: number;

        if (deploymentType !== 'cloud') {
            if (billingPeriod !== 'Annual') {
                throw new Error('Non-cloud pricing must always be annual');
            }
            const tierIndex = userCount === -1 ? pricingTiers.findIndex(t => t.userTier === -1) : pricingTiers.findIndex(t => userCount <= t.userTier);
            const pricingTier = pricingTiers[tierIndex];
            basePrice = pricingTier.cost;
            descriptors.push({ subtotal: basePrice, description: `Annual base price is ${formatCurrency(pricingTier.cost)}/year` });
            if (licenseDurationDays !== 365) {
                basePrice = basePrice * licenseDurationDays / 365;
                descriptors.push({ subtotal: basePrice, description: `Prorating ${formatCurrency(pricingTier.cost)} by license duration (${licenseDurationDays}/365 days)` });
            }
        } else {
            if (userCount <= pricingTiers[0].userTier) {
                basePrice = pricingTiers[0].cost;
                descriptors.push({ subtotal: basePrice, description: `Base monthly price for first tier is ${formatCurrency(basePrice)}` });
            } else {
                basePrice = this.computeTierPrice({ userCount, perUserTiers: pricingTiers });
                descriptors.push({ subtotal: basePrice, description: `Base monthly price for tier with ${userCount} users is ${formatCurrency(basePrice)}` });
            }
            if (billingPeriod === 'Annual') {
                basePrice = basePrice * ANNUAL_DISCOUNT_MULTIPLIER * licenseDurationDays / 365;
                if (licenseDurationDays !== 365) {
                    descriptors.push({ subtotal: basePrice, description: `Annual discount: 12 months for the price of ${ANNUAL_DISCOUNT_MULTIPLIER} and prorate for ${licenseDurationDays} days: price * ${ANNUAL_DISCOUNT_MULTIPLIER} * ${licenseDurationDays} / 365` });
                } else {
                    descriptors.push({ subtotal: basePrice, description: `Annual discount: 12 months for the price of ${ANNUAL_DISCOUNT_MULTIPLIER}` });
                }
            } else {
                if (licenseDurationDays < 29) {
                    if (licenseDurationDays === 0) {
                        basePrice = 0;
                    } else {
                        basePrice = basePrice * (licenseDurationDays + 2) / 31;
                        descriptors.push({ subtotal: basePrice, description: `Short month: prorate by (${licenseDurationDays}+2)/31 days` });
                    }
                }
            }
        }

        return { basePrice, descriptors, licenseDurationDays, userCount };
    }

    private computeTierPrice(opts: { userCount: number; perUserTiers: UserTierPricing[]; }): number {
        const { userCount, perUserTiers } = opts;

        let cost = 0;

        // First tier is flat

        if (userCount <= perUserTiers[0].userTier) {
            return perUserTiers[0].cost;
        }

        let remainingUsers = userCount;
        let priorPeriodUsers = 0;

        for (let i=1; i < perUserTiers.length; i++) {
            const tier = perUserTiers[i];

            let usersInThisTier = tier.userTier===-1 ? remainingUsers : tier.userTier - priorPeriodUsers;
            const usersToPrice = Math.min(usersInThisTier, remainingUsers);

            cost += usersToPrice * tier.cost;
            priorPeriodUsers = tier.userTier;

            remainingUsers -= usersToPrice;

            if (remainingUsers <= 0) {
                break;
            }
        }

        return cost;
    }

    // Apply expected discounts for academic and social impact licenses

    private getLicenseTypeDiscountFraction(opts: { licenseType: EnhancedLicenseType; saleDate: string; hosting: HostingType; userCount: number; parentProduct: string; }): number {
        const { licenseType, saleDate, hosting, userCount, parentProduct } = opts;

        if (!isDiscountedLicenseType(licenseType)) {
            throw new Error(`License type is not discounted: ${licenseType}`);
        }

        if (hosting==='Cloud') {
            if (licenseType==='ACADEMIC') {
                return ACADEMIC_CLOUD_PRICE_RATIO;
            }

            if (licenseType==='SOCIAL_IMPACT' || licenseType==='COMMUNITY' || licenseType==='FOUNDATION_FREE') {
                return COMMUNITY_CLOUD_PRICE_RATIO;
            }

            if (licenseType==='SOCIAL_IMPACT_GLOBAL_ACCESS') {
                return SOCIAL_IMPACT_GLOBAL_ACCESS_CLOUD_PRICE_RATIO;
            }

            throw new Error(`Unknown discounted cloud license type: ${licenseType}`);
        }

        // Somewhere in 2024, Atlassian changed the pricing for academic data center licenses to apply a
        // 75% discount for user tiers of 10k+ for Confluence licenses.

        if (saleDate < ACADEMIC_DC_PRICE_RATIO_CURRENT_START_DATE) {
            return ACADEMIC_DC_PRICE_RATIO_LEGACY;
        }

        if (parentProduct==='confluence' && (userCount === -1 || userCount >= 10000)) {
            return ACADEMIC_DC_PRICE_RATIO_CURRENT_CONF_10K;
        }

        return ACADEMIC_DC_PRICE_RATIO_CURRENT_OTHER;
    }

    /** Shared: apply refund negation and academic/community discount. */
    private applyRefundAndAcademicDiscounts(
        opts: PriceCalcOpts,
        basePrice: number,
        descriptors: PriceCalcDescriptor[],
        userCount: number
    ): { basePrice: number; descriptors: PriceCalcDescriptor[] } {
        const { saleType, licenseType, saleDate, hosting, parentProduct } = opts;
        let price = basePrice;

        if (saleType === 'Refund') {
            price = -price;
            descriptors = [...descriptors, { subtotal: price, description: 'Refund: negate base price' }];
        }

        if (isDiscountedLicenseType(licenseType)) {
            const licenseTypeDiscountFraction = this.getLicenseTypeDiscountFraction({
                licenseType,
                saleDate,
                hosting,
                userCount,
                parentProduct
            });
            price *= licenseTypeDiscountFraction;
            descriptors = [
                ...descriptors,
                {
                    subtotal: price,
                    description: `Apply ${licenseType.toLowerCase()} discount of ${(1 - licenseTypeDiscountFraction) * 100}%`
                }
            ];
        }

        return { basePrice: price, descriptors };
    }

    /** Shared: apply expected manual/promo discount and Solutions Partner discount. */
    private applyExpectedAndPartnerDiscounts(
        opts: PriceCalcOpts,
        basePrice: number,
        descriptors: PriceCalcDescriptor[]
    ): { basePrice: number; descriptors: PriceCalcDescriptor[] } {
        const { saleType, expectedDiscount, declaredPartnerDiscount } = opts;
        let price = basePrice;

        if (expectedDiscount) {
            const discountPercent = (expectedDiscount / price) * 100;
            price -= expectedDiscount * (saleType === 'Refund' ? -1 : 1);
            descriptors = [
                ...descriptors,
                {
                    subtotal: price,
                    description: `Apply expected manual/promo discount of: ${formatCurrency(expectedDiscount)} (${discountPercent.toFixed(2)}%)`
                }
            ];
        }

        if (declaredPartnerDiscount !== 0) {
            const partnerDiscountFraction = declaredPartnerDiscount / price;
            price -= declaredPartnerDiscount;
            descriptors = [
                ...descriptors,
                {
                    subtotal: price,
                    description: `Apply Solutions Partner discount of ${formatCurrency(declaredPartnerDiscount)} (${(partnerDiscountFraction * 100).toFixed(2)}%)`
                }
            ];
        }

        return { basePrice: price, descriptors };
    }

    /** Applies vendor discount rate and returns the final PriceResult. */
    private finalizePriceResult(
        opts: PriceCalcOpts,
        basePriceAfterDiscounts: number,
        purchasePrice: number,
        dailyNominalPrice: number,
        descriptors: PriceCalcDescriptor[]
    ): PriceResult {
        const { saleDate, discountReferenceSaleDate, forgeMigrationDate, alwaysForge } = opts;
        const discountDate = discountReferenceSaleDate || saleDate;
        const deploymentType = deploymentTypeFromHosting(opts.hosting);
        const discountAmount = this.getDiscountAmount({ saleDate: discountDate, deploymentType, forgeMigrationDate, alwaysForge });
        const vendorPrice = basePriceAfterDiscounts * discountAmount;

        descriptors = [
            ...descriptors,
            { subtotal: vendorPrice, description: `Apply Atlassian discount rate of ${discountAmount * 100}%` }
        ];

        return {
            purchasePrice: Math.round(purchasePrice * 100) / 100,
            vendorPrice: Math.round(vendorPrice * 100) / 100,
            dailyNominalPrice,
            descriptors
        };
    }

    /**
     * Monthly price for one MQB segment (addedUsers). When the license size is known we use marginal tier
     * (cost of adding these users to the existing count); otherwise we fall back to tier based on addedUsers only.
     * The latter part is not actually correct (we need to know the marginal tier), but we will flag that error
     * in TransactionValidator.
     */
    private getMQBSegmentMonthlyPrice(opts: {
        addedUsers: number;
        runningLicenseUserCount: number | undefined;
        pricingTiers: UserTierPricing[];
    }): number {
        const { addedUsers, runningLicenseUserCount, pricingTiers } = opts;
        if (runningLicenseUserCount != null) {
            return this.computeTierPrice({ userCount: runningLicenseUserCount + addedUsers, perUserTiers: pricingTiers })
                - this.computeTierPrice({ userCount: runningLicenseUserCount, perUserTiers: pricingTiers });
        }
        if (addedUsers <= pricingTiers[0].userTier && pricingTiers.length > 1) {
            return addedUsers * pricingTiers[1].cost;
        }
        if (addedUsers <= pricingTiers[0].userTier) {
            return pricingTiers[0].cost;
        }
        return this.computeTierPrice({ userCount: addedUsers, perUserTiers: pricingTiers });
    }

    /**
     * Core pricing for MQB (Maximum Quantity Billing): prorated segments for added users during a monthly cycle.
     * Each proratedDetail has a date and addedUsers; charge from that date to maintenanceEndDate.
     * Uses mqbLicenseUserCount (from overlapping full-period transaction) for marginal tier; caller must pass it.
     * Returns base price and descriptors only (no refund/discounts/finalization).
     */
    private computeMQBCore(opts: PriceCalcOpts): CorePriceResult {
        const { pricingTierResult, maintenanceEndDate, proratedDetails, mqbLicenseUserCount } = opts;
        const descriptors: PriceCalcDescriptor[] = [];
        const { tiers: pricingTiers } = pricingTierResult;

        const licenseDurationDays = getLicenseDurationInDays(opts.maintenanceStartDate, maintenanceEndDate);

        // License size for marginal tier: caller must pass mqbLicenseUserCount (e.g. from overlapping transaction); tier/oldTier on MQB lines are unreliable
        const licenseUserCount = mqbLicenseUserCount;

        let totalPurchase = 0;
        let runningLicenseUserCount = licenseUserCount ?? 0;

        for (const segment of proratedDetails ?? []) {
            const addedUsers = segment.addedUsers ?? 0;
            const segmentStartRaw = segment.date ?? opts.maintenanceStartDate;
            const segmentStart = isoStringWithOnlyDate(segmentStartRaw);

            if (addedUsers <= 0) continue;

            const daysInSegment = getLicenseDurationInDays(segmentStart, maintenanceEndDate);
            if (daysInSegment <= 0) continue;

            const monthlyPriceForUsers = this.getMQBSegmentMonthlyPrice({
                addedUsers,
                runningLicenseUserCount: licenseUserCount != null ? runningLicenseUserCount : undefined,
                pricingTiers
            });

            const segmentPrice = (monthlyPriceForUsers * daysInSegment) / MQB_BILLING_MONTH_DAYS;

            totalPurchase += segmentPrice;
            if (licenseUserCount != null) {
                runningLicenseUserCount += addedUsers;
            }
            descriptors.push({
                subtotal: segmentPrice,
                description: `MQB segment: ${addedUsers} users from ${segmentStart} to ${maintenanceEndDate} (${daysInSegment} days): ${formatCurrency(monthlyPriceForUsers)}/mo × ${daysInSegment}/${MQB_BILLING_MONTH_DAYS} = ${formatCurrency(segmentPrice)}`
            });
        }

        descriptors.push({
            subtotal: totalPurchase,
            description: `MQB subtotal: ${formatCurrency(totalPurchase)}`
        });

        const userCount = proratedDetails?.reduce((s, d) => s + (d.addedUsers ?? 0), 0) ?? 0;

        return {
            basePrice: totalPurchase,
            descriptors,
            licenseDurationDays,
            userCount
        };
    }

    private isFreeLicense(opts: PriceCalcOpts): { isFreeLicense: boolean; freeDescriptors: PriceCalcDescriptor[] } {
        const { isSandbox, licenseType, hosting, discounts } = opts;

        if (isSandbox && hosting==='Cloud') {
            return { isFreeLicense: true, freeDescriptors: [{ subtotal: 0, description: 'Cloud sandbox licenses are free' }] };
        }

        if (licenseType==='OPEN_SOURCE') {
            return { isFreeLicense: true, freeDescriptors: [{ subtotal: 0, description: 'Open source licenses are free' }] };
        }

        if (isCommunityLicense(licenseType) && hosting==='Data Center') {
            return { isFreeLicense: true, freeDescriptors: [{ subtotal: 0, description: 'Social Impact DC licenses are free' }] };
        }

        if (discounts && discounts.some(d => d.type==='MANUAL' && d.reason==='DUAL_LICENSING')) {
            return { isFreeLicense: true, freeDescriptors: [{ subtotal: 0, description: 'Free license under dual-licensing' }] };
        }

        return { isFreeLicense: false, freeDescriptors: [] };
    }
}