import { PurchaseDetails } from "./ValidationService";
import { getLicenseDurationInDays, getSubscriptionOverlapDays } from "./licenseDurationCalculator";
import { DeploymentType, PricingTierResult } from "../services/PricingService";
import { UserTierPricing } from '../types/userTiers';
import { deploymentTypeFromHosting, userCountFromTier } from "./validationUtils";
import { ACADEMIC_CLOUD_PRICE_RATIO, ACADEMIC_DC_PRICE_RATIO, CLOUD_DISCOUNT_RATIO, DC_DISCOUNT_RATIO } from "./constants";
import { Transaction } from "../entities/Transaction";
import { injectable } from "inversify";

const ANNUAL_DISCOUNT_MULTIPLIER = 10; // 12 months for the price of 10 months

export interface PriceCalcOpts {
    pricingTierResult: PricingTierResult;
    saleDate: string;
    saleType: "New" | "Refund" | "Renewal" | "Upgrade";
    isSandbox: boolean;
    hosting: "Server" | "Data Center" | "Cloud";
    licenseType: "ACADEMIC" | "COMMERCIAL" | "COMMUNITY" | "EVALUATION" | "OPEN_SOURCE";
    tier: string;
    maintenanceStartDate: string;
    maintenanceEndDate: string;
    billingPeriod: "Monthly" | "Annual";
    previousPurchase?: Transaction|undefined;
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
    private getDiscountAmount(saleDate: string, deploymentType: DeploymentType): number {
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
            previousPurchase,
            expectedDiscount
        } = opts;

        if (isSandbox) {
            return { vendorPrice: 0, purchasePrice: 0, dailyNominalPrice: 0 };
        }

        if (expectedDiscount && expectedDiscount < 0) {
            throw new Error('Expected discount must be positive');
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

            const tierIndex = pricingTiers.findIndex(t => userCount <= t.userTier);
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
            }
        }

        if (saleType==='Refund') {
            basePrice = -basePrice;
        }

        // Apply academic discount if applicable
        if (licenseType==='ACADEMIC' || licenseType==='COMMUNITY') {
            basePrice = basePrice * (hosting==='Cloud' ? ACADEMIC_CLOUD_PRICE_RATIO : ACADEMIC_DC_PRICE_RATIO);
        }

        // Now we start to calculate the final value paid to Atlassian
        let purchasePrice = billingPeriod==='Annual' ? Math.ceil(basePrice) : basePrice;
        const dailyNominalPrice = purchasePrice / licenseDurationDays;

        // If this is an upgrade, then we need to calculate the price differential for the
        // overlap in subscription length.

        if (saleType==='Upgrade' && previousPurchase) {
            const { previousPricing } = opts;

            const overlapDays = getSubscriptionOverlapDays(maintenanceStartDate, previousPurchase.data.purchaseDetails.maintenanceEndDate);

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
}