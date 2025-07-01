import { getLicenseDurationInDays, getSubscriptionOverlapDays } from "#common/util/licenseDurationCalculator";
import { UserTierPricing } from '#common/types/userTiers';
import { deploymentTypeFromHosting, userCountFromTier } from "#common/util/validationUtils";
import {
    ACADEMIC_CLOUD_PRICE_RATIO,
    ACADEMIC_DC_PRICE_RATIO_CURRENT_CONF_10K,
    ACADEMIC_DC_PRICE_RATIO_CURRENT_OTHER,
    ACADEMIC_DC_PRICE_RATIO_CURRENT_START_DATE,
    ACADEMIC_DC_PRICE_RATIO_LEGACY,
    CLOUD_DISCOUNT_RATIO,
    DC_DISCOUNT_RATIO
} from "#server/util/validationConstants";
import { injectable } from "inversify";
import { DeploymentType, HostingType } from "#common/types/marketplace";
import { PriceCalcDescriptor, PriceCalcOpts, PriceResult } from '#server/services/types';
import { formatCurrency } from "#common/util/formatCurrency";

const ANNUAL_DISCOUNT_MULTIPLIER = 10; // 12 months for the price of 10 months

@injectable()
export class PriceCalculatorService {
    private getDiscountAmount(_saleDate: string, deploymentType: DeploymentType): number {
        // For revenue share changes, we will eventually need to use the sale date.
        return deploymentType==='cloud' ? CLOUD_DISCOUNT_RATIO : DC_DISCOUNT_RATIO;
    }

    public calculateExpectedPrice(opts: PriceCalcOpts): PriceResult {
        const {
            pricingTierResult,
            saleDate,
            saleType,
            hosting,
            licenseType,
            tier,
            maintenanceStartDate,
            maintenanceEndDate,
            billingPeriod,
            previousPurchaseMaintenanceEndDate,
            expectedDiscount,
            declaredPartnerDiscount,
            parentProduct
        } = opts;

        const { isFreeLicense, freeDescriptors } = this.isFreeLicense(opts);

        if (isFreeLicense) {
            return { vendorPrice: 0, purchasePrice: 0, dailyNominalPrice: 0, descriptors: freeDescriptors };
        }

        const descriptors : PriceCalcDescriptor[] = [];

        const deploymentType = deploymentTypeFromHosting(hosting);
        const userCount = userCountFromTier(tier);
        const { tiers: pricingTiers } = pricingTierResult;
        const licenseDurationDays = getLicenseDurationInDays(maintenanceStartDate, maintenanceEndDate);
        let basePrice;

        // Non-cloud pricing is always annual
        if (deploymentType !== 'cloud') {
            if (billingPeriod !== 'Annual') {
                throw new Error('Non-cloud pricing must always be annual');
            }

            const tierIndex = userCount===-1 ? pricingTiers.findIndex(t => t.userTier===-1) : pricingTiers.findIndex(t => userCount <= t.userTier);
            const pricingTier : UserTierPricing = pricingTiers[tierIndex];

            basePrice = pricingTier.cost;
            descriptors.push({ subtotal: basePrice, description: `Annual base price is ${formatCurrency(pricingTier.cost)}/year`});

            if (licenseDurationDays !== 365) {
                basePrice = basePrice * licenseDurationDays / 365;
                descriptors.push({ subtotal: basePrice, description: `Prorating ${formatCurrency(pricingTier.cost)} by license duration (${licenseDurationDays}/365 days)`});
            }
        } else {
            if (userCount <= pricingTiers[0].userTier) {
                // Fixed pricing for first tier (up to 10 users)
                basePrice = pricingTiers[0].cost;
                descriptors.push({ subtotal: basePrice, description: `Base monthly price for first tier is ${formatCurrency(basePrice)}`});
            } else {
                // Variable, per-user pricing for all other tiers
                basePrice = this.computeTierPrice({ userCount, perUserTiers: pricingTiers });
                descriptors.push({ subtotal: basePrice, description: `Base monthly price for tier with ${userCount} users is ${formatCurrency(basePrice)}`});
            }

            if (billingPeriod === 'Annual') {
                basePrice = basePrice * ANNUAL_DISCOUNT_MULTIPLIER * licenseDurationDays / 365;

                if (licenseDurationDays !== 365) {
                    descriptors.push({ subtotal: basePrice, description: `Annual discount: 12 months for the price of ${ANNUAL_DISCOUNT_MULTIPLIER} and prorate for ${licenseDurationDays} days: price * ${ANNUAL_DISCOUNT_MULTIPLIER} * ${licenseDurationDays} / 365`});
                } else {
                    descriptors.push({ subtotal: basePrice, description: `Annual discount: 12 months for the price of ${ANNUAL_DISCOUNT_MULTIPLIER}`});
                }
            } else {
                // Should be monthly, but handle short months based on Atassian's magic formula
                // (Not entirely sure this is correct and it may need to be updated)

                if (licenseDurationDays < 29) {
                    if (licenseDurationDays===0) {
                        basePrice = 0;
                    } else {
                        basePrice = basePrice * (licenseDurationDays+2) / 31;
                        descriptors.push({ subtotal: basePrice, description: `Short month: prorate by (${licenseDurationDays}+2)/31 days`});
                    }
                }
            }
        }

        if (saleType==='Refund') {
            basePrice = -basePrice;
            descriptors.push({ subtotal: basePrice, description: `Refund: negate base price`});
        }

        // Apply academic/community discount if applicable
        if (licenseType==='ACADEMIC' || licenseType==='COMMUNITY') {
            const licenseTypeDiscountFraction = this.getLicenseTypeDiscountFraction({ saleDate, hosting, userCount, parentProduct });
            basePrice *= licenseTypeDiscountFraction;
            descriptors.push({ subtotal: basePrice, description: `Apply ${licenseType.toLowerCase()} discount of ${(1-licenseTypeDiscountFraction)*100}%`});
        }

        // Now we start to calculate the final value paid to Atlassian

        if (billingPeriod==='Annual' && basePrice != Math.ceil(basePrice)) {
            descriptors.push({ subtotal: Math.ceil(basePrice), description: `Round to integer for annual billing`});
        }

        let purchasePrice = billingPeriod==='Annual' ? Math.ceil(basePrice) : basePrice;

        const dailyNominalPrice = licenseDurationDays===0 ? 0 : purchasePrice / licenseDurationDays;

        descriptors.push({ description: `Daily nominal price = purchase price / days in license = ${formatCurrency(purchasePrice)} / ${licenseDurationDays} = ${formatCurrency(dailyNominalPrice)}`});

        // If this is an upgrade/downgrade, then we need to calculate the price differential for the
        // overlap in subscription length.

        if ((saleType==='Upgrade' || saleType==='Downgrade') && previousPurchaseMaintenanceEndDate) {
            const { previousPricing } = opts;

            const overlapDays = getSubscriptionOverlapDays(maintenanceStartDate, previousPurchaseMaintenanceEndDate);

            if (overlapDays > licenseDurationDays) {
                throw new Error('Overlap days are greater than the license duration');
            }

            if (overlapDays > 0 && previousPricing && previousPricing.purchasePrice > 0) {

                const newDays = licenseDurationDays - overlapDays;

                // Calculate the payment for the days that aren't included in the old license
                const newPeriodPrice = dailyNominalPrice * newDays;
                descriptors.push({ description: `Subscription has ${newDays} non-overlapping days at new license price (${formatCurrency(dailyNominalPrice)} * ${newDays}) = ${formatCurrency(newPeriodPrice)}`});

                // For the days already partially paid, subtract the old daily price
                const oldPeriodPricePerDay = dailyNominalPrice - previousPricing.dailyNominalPrice;
                const oldPeriodPrice = oldPeriodPricePerDay * overlapDays;

                descriptors.push({ description: `Subscription overlaps ${overlapDays} days with old license, which are billed at ${formatCurrency(dailyNominalPrice)} - ${formatCurrency(previousPricing.dailyNominalPrice)} = ${formatCurrency(oldPeriodPricePerDay)} per day, or ${formatCurrency(oldPeriodPrice)} total`});

                // Now update the base price and purchase price
                basePrice = oldPeriodPrice + newPeriodPrice;
                purchasePrice = billingPeriod==='Annual' ? Math.ceil(basePrice) : basePrice;

                descriptors.push({ subtotal: basePrice, description: `Final upgrade price = ${formatCurrency(oldPeriodPrice)} + ${formatCurrency(newPeriodPrice)}`});
            }
        }

        // If partner or other manual discount

        if (expectedDiscount) {
            const discountPercent = (expectedDiscount / basePrice) * 100;
            basePrice -= expectedDiscount * (saleType==='Refund' ? -1 : 1);
            descriptors.push({ subtotal: basePrice, description: `Apply expected manual/promo discount of: ${formatCurrency(expectedDiscount)} (${discountPercent.toFixed(2)}%)`});
        }

        if (declaredPartnerDiscount !== 0) {
            const partnerDiscountFraction = declaredPartnerDiscount / basePrice;
            basePrice -= declaredPartnerDiscount;
            descriptors.push({ subtotal: basePrice, description: `Apply Solutions Partner discount of ${formatCurrency(declaredPartnerDiscount)} (${(partnerDiscountFraction*100).toFixed(2)}%)`});
        }

        if (billingPeriod === 'Annual') {
            if (basePrice != Math.ceil(basePrice)) {
                basePrice = Math.ceil(basePrice);
                descriptors.push({ subtotal: basePrice, description: `Round to integer for annual billing`});
            }
        }

        // Adjust the purchase price after any discounts

        purchasePrice = basePrice;

        // TODO FIXME need to adjust purchasePrice here too?
        // dailyNominalPrice = purchasePrice / licenseDurationDays;

        if (billingPeriod==='Annual' && hosting !== 'Cloud' && basePrice != Math.ceil(basePrice)) {
            basePrice = Math.ceil(basePrice);
            descriptors.push({ subtotal: basePrice, description: `Round again to integer for DC`});
        }

        const discountAmount = this.getDiscountAmount(saleDate, deploymentType);
        basePrice *= discountAmount;
        descriptors.push({ subtotal: basePrice, description: `Apply Atlassian discount rate of ${discountAmount*100}%`});

        return {
            purchasePrice: Math.round(purchasePrice * 100)/100,
            vendorPrice: Math.round(basePrice * 100)/100,
            dailyNominalPrice,
            descriptors
        };
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

    // Apply expecteddiscounts for academic and community licenses

    private getLicenseTypeDiscountFraction(opts: { saleDate: string; hosting: HostingType; userCount: number; parentProduct: string; }): number {
        const { saleDate, hosting, userCount, parentProduct } = opts;

        if (hosting==='Cloud') {
            return ACADEMIC_CLOUD_PRICE_RATIO;
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

    private isFreeLicense(opts: PriceCalcOpts): { isFreeLicense: boolean; freeDescriptors: PriceCalcDescriptor[] } {
        const { isSandbox, licenseType, hosting, discounts } = opts;

        if (isSandbox && hosting==='Cloud') {
            return { isFreeLicense: true, freeDescriptors: [{ subtotal: 0, description: 'Cloud sandbox licenses are free' }] };
        }

        if (licenseType==='OPEN_SOURCE') {
            return { isFreeLicense: true, freeDescriptors: [{ subtotal: 0, description: 'Open source licenses are free' }] };
        }

        if (licenseType==='COMMUNITY' && hosting==='Data Center') {
            return { isFreeLicense: true, freeDescriptors: [{ subtotal: 0, description: 'Community DC licenses are free' }] };
        }

        if (discounts && discounts.some(d => d.type==='MANUAL' && d.reason==='DUAL_LICENSING')) {
            return { isFreeLicense: true, freeDescriptors: [{ subtotal: 0, description: 'Free license under dual-licensing' }] };
        }

        return { isFreeLicense: false, freeDescriptors: [] };
    }
}