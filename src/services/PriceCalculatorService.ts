import { getLicenseDurationInDays, getSubscriptionOverlapDays } from "../utils/licenseDurationCalculator";
import { DeploymentType, PricingTierResult } from "./PricingService";
import { UserTierPricing } from '../types/userTiers';
import { deploymentTypeFromHosting, userCountFromTier } from "../utils/validationUtils";
import {
    ACADEMIC_CLOUD_PRICE_RATIO,
    ACADEMIC_DC_PRICE_RATIO_LEGACY,
    ACADEMIC_DC_PRICE_RATIO_CURRENT_10K,
    ACADEMIC_DC_PRICE_RATIO_CURRENT_START_DATE,
    CLOUD_DISCOUNT_RATIO,
    DC_DISCOUNT_RATIO
} from "../config/validationConstants";
import { injectable } from "inversify";

const ANNUAL_DISCOUNT_MULTIPLIER = 10; // 12 months for the price of 10 months

export type HostingType = "Server" | "Data Center" | "Cloud";
export type LicenseType = "ACADEMIC" | "COMMERCIAL" | "COMMUNITY" | "EVALUATION" | "OPEN_SOURCE";

export interface PriceCalcOpts {
    pricingTierResult: PricingTierResult;
    saleDate: string;
    saleType: "New" | "Refund" | "Renewal" | "Upgrade";
    isSandbox: boolean;
    hosting: HostingType;
    licenseType: "ACADEMIC" | "COMMERCIAL" | "COMMUNITY" | "EVALUATION" | "OPEN_SOURCE";
    tier: string;
    maintenanceStartDate: string;
    maintenanceEndDate: string;
    billingPeriod: "Monthly" | "Annual";
    previousPurchaseMaintenanceEndDate?: string|undefined;
    previousPricing?: PriceResult|undefined;
    expectedDiscount?: number; // always positive, even for refunds
}

export interface PriceResult {
    vendorPrice: number;
    purchasePrice: number;
    dailyNominalPrice: number;
}

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
            isSandbox,
            hosting,
            licenseType,
            tier,
            maintenanceStartDate,
            maintenanceEndDate,
            billingPeriod,
            previousPurchaseMaintenanceEndDate,
            expectedDiscount
        } = opts;

        if (isSandbox) {
            return { vendorPrice: 0, purchasePrice: 0, dailyNominalPrice: 0 };
        }

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
            basePrice = basePrice * licenseDurationDays / 365;
        } else {
            if (userCount <= pricingTiers[0].userTier) {
                // Fixed pricing for first tier (up to 10 users)
                basePrice = pricingTiers[0].cost;
            } else {
                // Variable, per-user pricing for all other tiers
                basePrice = this.computeTierPrice({ userCount, perUserTiers: pricingTiers });
            }

            if (billingPeriod === 'Annual') {
                basePrice = basePrice * ANNUAL_DISCOUNT_MULTIPLIER * licenseDurationDays / 365;
            } else {
                // Should be monthly, but handle short months based on Atassian's magic formula
                // (Not entirely sure this is correct and it may need to be updated)

                if (licenseDurationDays < 29) {
                    basePrice = basePrice * (licenseDurationDays+2) / 31;
                }
            }
        }

        if (saleType==='Refund') {
            basePrice = -basePrice;
        }

        // Apply academic discount if applicable
        if (licenseType==='ACADEMIC' || licenseType==='COMMUNITY') {
            basePrice = this.applyLicenseTypeDiscounts({ basePrice, saleDate, hosting, userCount });
        }

        // Now we start to calculate the final value paid to Atlassian
        let purchasePrice = billingPeriod==='Annual' ? Math.ceil(basePrice) : basePrice;
        const dailyNominalPrice = purchasePrice / licenseDurationDays;

        // If this is an upgrade, then we need to calculate the price differential for the
        // overlap in subscription length.

        if (saleType==='Upgrade' && previousPurchaseMaintenanceEndDate) {
            const { previousPricing } = opts;

            const overlapDays = getSubscriptionOverlapDays(maintenanceStartDate, previousPurchaseMaintenanceEndDate);

            if (overlapDays > licenseDurationDays) {
                throw new Error('Overlap days are greater than the license duration');
            }

            if (overlapDays > 0 && previousPricing && previousPricing.purchasePrice > 0) {
                const newDays = licenseDurationDays - overlapDays;

                // Calculate the payment for the days that aren't included in the old license
                const newPeriodPrice = dailyNominalPrice * newDays;

                // For the days already partially paid, subtract the old daily price
                const oldPeriodPrice = (dailyNominalPrice - previousPricing.dailyNominalPrice) * overlapDays;

                // Now update the base price and purchase price
                basePrice = oldPeriodPrice + newPeriodPrice;
                purchasePrice = billingPeriod==='Annual' ? Math.ceil(basePrice) : basePrice;
            }
        }

        // If partner or other manual discount

        if (expectedDiscount) {
            basePrice -= expectedDiscount * (saleType==='Refund' ? -1 : 1);
        }

        if (billingPeriod === 'Annual') {
            basePrice = Math.ceil(basePrice);
        }

        // Adjust the purchase price after any discounts

        purchasePrice = basePrice;

        // TODO FIXME need to adjust purchasePrice here too?
        // dailyNominalPrice = purchasePrice / licenseDurationDays;

        if (billingPeriod==='Annual' && hosting !== 'Cloud') {
            basePrice = Math.ceil(basePrice);
        }

        basePrice *= this.getDiscountAmount(saleDate, deploymentType);

        return {
            purchasePrice: Math.round(purchasePrice * 100)/100,
            vendorPrice: Math.round(basePrice * 100)/100,
            dailyNominalPrice
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

    private applyLicenseTypeDiscounts(opts: { basePrice: number; saleDate: string; hosting: HostingType; userCount: number; }): number {
        const { basePrice, saleDate, hosting, userCount } = opts;

        if (hosting==='Cloud') {
            return basePrice * ACADEMIC_CLOUD_PRICE_RATIO;
        }

        if (saleDate < ACADEMIC_DC_PRICE_RATIO_CURRENT_START_DATE) {
            return basePrice * ACADEMIC_DC_PRICE_RATIO_LEGACY;
        }

        // Somewhere in 2024, Atlassian changed the pricing for academic data center licenses to apply a
        // 75% discount for user tiers of 10k+ for Confluence licenses.

        if (userCount !== -1 && userCount < 10000) {
            // If under 10k (and not unlimited), continue with the 50% discount
            return basePrice * ACADEMIC_DC_PRICE_RATIO_LEGACY;
        }

        return basePrice * ACADEMIC_DC_PRICE_RATIO_CURRENT_10K;
    }
}