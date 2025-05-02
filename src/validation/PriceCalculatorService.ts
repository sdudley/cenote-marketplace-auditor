import { PurchaseDetails } from "./ValidationService";
import { getLicenseDurationInDays } from "./licenseDurationCalculator";
import { DeploymentType, UserTierPricing } from "../services/PricingService";
import { deploymentTypeFromHosting, userCountFromTier } from "./validationUtils";
import { ACADEMIC_PRICE_RATIO, CLOUD_DISCOUNT_RATIO, DC_DISCOUNT_RATIO } from "./constants";
import { Transaction } from "../entities/Transaction";

export interface PriceCalcOpts {
    pricing: UserTierPricing[];
    saleDate: string;
    saleType: "New" | "Refund" | "Renewal" | "Upgrade";
    isSandbox: boolean;
    hosting: "Server" | "Data Center" | "Cloud";
    licenseType: "ACADEMIC" | "COMMERCIAL" | "COMMUNITY" | "EVALUATION" | "OPEN_SOURCE";
    tier: string;
    maintenanceStartDate: string;
    maintenanceEndDate: string;
    billingPeriod: "Monthly" | "Annual";
}

export interface PriceResult {
    vendorPrice: number;
    purchasePrice: number;
}

export class PriceCalculatorService {
    private getDiscountAmount(saleDate: string, deploymentType: DeploymentType): number {
        return deploymentType==='cloud' ? CLOUD_DISCOUNT_RATIO : DC_DISCOUNT_RATIO;
    }

    public calculateExpectedPrice(opts: PriceCalcOpts): PriceResult {
        const {
            pricing,
            saleDate,
            saleType,
            isSandbox,
            hosting,
            licenseType,
            tier,
            maintenanceStartDate,
            maintenanceEndDate,
            billingPeriod,
        } = opts;

        if (isSandbox) {
            return { vendorPrice: 0, purchasePrice: 0 };
        }

        const deploymentType = deploymentTypeFromHosting(hosting);
        const userCount = userCountFromTier(tier);

        // Find the appropriate tier for the user count
        const tierIndex = pricing.findIndex(t => userCount <= t.userTier);

        if (tierIndex === -1) {
            return { vendorPrice: 0, purchasePrice: 0 };
        }

        const pricingTier : UserTierPricing = pricing[tierIndex];
        const { cost } = pricingTier;

        const licenseDurationDays = getLicenseDurationInDays(maintenanceStartDate, maintenanceEndDate);

        let basePrice;

        // Non-cloud pricing is always annual
        if (deploymentType !== 'cloud') {
            if (billingPeriod !== 'Annual') {
                throw new Error('Non-cloud pricing must always be annual');
            }

            basePrice = cost;
        } else {
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
        }

        if (billingPeriod === 'Monthly') {
            basePrice /= 10; // 2-month discount for annual
        } else {
            basePrice = basePrice * licenseDurationDays / 365;
        }

        if (saleType==='Refund') {
            basePrice = -basePrice;
        }

        // Apply academic discount if applicable
        if (licenseType==='ACADEMIC' || licenseType==='COMMUNITY') {
            basePrice = basePrice * ACADEMIC_PRICE_RATIO;
        }

        const purchasePrice = billingPeriod==='Annual' ? Math.ceil(basePrice) : basePrice;

        if (billingPeriod === 'Annual') {
            basePrice = Math.ceil(basePrice);
        }

        basePrice *= this.getDiscountAmount(saleDate, deploymentType);

        // If partner discount:

        if (false /* marketplacePromotion */) {
            basePrice *= 0.95;
            basePrice = Math.floor(basePrice * 0.95);
        }

        if (billingPeriod==='Annual' && hosting !== 'Cloud') {
            basePrice = Math.ceil(basePrice);
        }

        return { purchasePrice: Math.round(purchasePrice * 100)/100, vendorPrice: Math.round(basePrice * 100)/100 };
    }
}