import { PurchaseDetails } from "./ValidationService";
import { calculateLicenseDurationInMonths, calculateLicenseDuration } from "./licenseDurationCalculator";
import { UserTierPricing } from "../services/PricingService";
import { deploymentTypeFromHosting, userCountFromTier } from "./validationUtils";
import { ACADEMIC_PRICE_RATIO } from "./constants";

export class PriceCalculatorService {
    public calculateExpectedPrice(opts: { purchaseDetails: PurchaseDetails, pricing: UserTierPricing[] }): number|undefined {
        const { purchaseDetails, pricing } = opts;
        const {
            hosting,
            licenseType,
            tier,
            changeInTier,
            oldTier,
            maintenanceStartDate,
            maintenanceEndDate,
            changeInBillingPeriod,
            billingPeriod,
            oldBillingPeriod
        } = purchaseDetails;

        const deploymentType = deploymentTypeFromHosting(hosting);
        const userCount = userCountFromTier(tier);

        // Find the appropriate tier for the user count
        const tierIndex = pricing.findIndex(t => userCount <= t.userTier);

        if (tierIndex === -1) {
            return undefined;
        }

        const pricingTier : UserTierPricing = pricing[tierIndex];
        const { cost } = pricingTier;

        // Non-cloud pricing is always annual
        if (deploymentType !== 'cloud') {
            if (billingPeriod !== 'Annual') {
                throw new Error('Non-cloud pricing must always be annual');
            }

            return cost;
        }

        let basePrice;

        if (!tier.startsWith('Per Unit Pricing') || tierIndex === 0) {
            // Fixed pricing for first tier (up to 10 users), or any user tier with annual billing
            basePrice = cost;
        } else {
            // For the first tier, we calculate the base price all the way from 0 users, not from the 10-user tier
            const priorPricingTier = tierIndex===1 ? { userTier: 0, cost: 0 } : pricing[tierIndex - 1];

            const usersInNewTier = userCount - priorPricingTier.userTier;
            const userDifferencePerTier = pricingTier.userTier - priorPricingTier.userTier;
            const pricePerUserInNewTier = (pricingTier.cost - priorPricingTier.cost) / userDifferencePerTier;
            basePrice = priorPricingTier.cost + (pricePerUserInNewTier * usersInNewTier);
        }

        // Calculate the license duration in days
        let licenseDurationMonths = calculateLicenseDurationInMonths(maintenanceStartDate, maintenanceEndDate);

        if (Math.trunc(licenseDurationMonths) !== licenseDurationMonths) {
            const licenseDurationDays = calculateLicenseDuration(maintenanceStartDate, maintenanceEndDate);
            licenseDurationMonths = licenseDurationDays / 365 * 12;
        }

        // Stored price is the annual price, which is based on 10 month-equivalents, so adjust it if using
        // monthly billing
        if (billingPeriod==='Monthly') {
            basePrice = basePrice * 12 / 10;
        }

        basePrice = basePrice * licenseDurationMonths / 12;

        // Apply academic discount if applicable
        if (licenseType==='ACADEMIC' || licenseType==='COMMUNITY') {
            basePrice = basePrice * ACADEMIC_PRICE_RATIO;
        }

        return basePrice;
    }
}