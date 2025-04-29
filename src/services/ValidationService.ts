import { DataSource } from 'typeorm';
import { Transaction } from '../entities/Transaction';
import { PricingService, UserTierPricing } from './PricingService';
import { DeploymentType } from './PricingService';
import { components } from '../types/marketplace-api';
import { Addon } from '../entities/Addon';

const NUM_TRANSACTIONS = 50;

interface TransactionData {
    addonKey: string;
    deploymentType: DeploymentType;
    userCount: number;
    amount: number;
    [key: string]: any;
}

export type PurchaseDetails = components['schemas']['TransactionPurchaseDetails'];

// Vendor discount amounts (after Atlassian share)
const getDiscountAmount = (saleDate: string, deploymentType: DeploymentType): number => {
    return deploymentType==='cloud' ? 0.85 : 0.75;
};

// Academic discount ratio
const ACADEMIC_PRICE_RATIO = 0.25;

const formatCurrency = (value: number | undefined): string => {
    if (value === undefined) return '$0.00';
    return `$${value.toFixed(2)}`;
};

const userCountFromTier = (tier: string): number => {
    if (tier === 'Unlimited Users') {
        return -1;
    }

    // Handle both 'XXXX Users' and 'Per Unit Pricing (XXXX Users)' formats
    const match = tier.match(/(\d+)\s+Users/);
    if (match) {
        return parseInt(match[1], 10);
    }

    throw new Error(`Invalid tier format: ${tier}`);
}

const deploymentTypeFromHosting = (hosting: string): DeploymentType => {
    switch (hosting) {
        case 'Server': return 'server';
        case 'Data Center': return 'datacenter';
        case 'Cloud': return 'cloud';
        default:
            throw new Error(`Unknown hosting type: ${hosting}`);
    }
}

const calculateLicenseDuration = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Set both dates to midnight to ensure we're comparing full days
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Calculate the difference in days
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    console.log(`${startDate} to ${endDate} = ${diffDays} days`);
    return diffDays;
}

const calculateLicenseDurationInMonths = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Set both dates to midnight to ensure we're comparing full days
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Calculate the difference in months
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    const totalMonths = years * 12 + months;

    // If the end day of month is the same as the start day of month, return the total integer number of months
    if (end.getDate()===start.getDate()) {
        return totalMonths;
    }

    // Calculate the days in the start and end months
    const daysInStartMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const daysInEndMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();

    // Calculate the fractions of the start and end months
    const startFraction = (daysInStartMonth - start.getDate() + 1) / daysInStartMonth;
    const endFraction = end.getDate() / daysInEndMonth;

    // Calculate the total fractional months
    const adjustedMonths = totalMonths - 1 + startFraction + endFraction;

    console.log(`${startDate} to ${endDate} = ${adjustedMonths.toFixed(2)} months`);
    return adjustedMonths;
}

export class ValidationService {
    constructor(
        private dataSource: DataSource,
        private pricingService: PricingService
    ) {}

    async validateTransactions(): Promise<void> {
        const transactionRepository = this.dataSource.getRepository(Transaction);
        const transactions = await transactionRepository
            .createQueryBuilder('transaction')
            .where('transaction."currentData"->\'purchaseDetails\'->>\'hosting\' = :hosting', { hosting: 'Cloud' })
            .orderBy('transaction."currentData"->\'purchaseDetails\'->>\'saleDate\'', 'DESC')
            .addOrderBy('transaction."createdAt"', 'DESC')
            .take(NUM_TRANSACTIONS)
            .getMany();

        const cloudPricing = await this.pricingService.getPricing('com.arsenale.plugins.lockpoint', 'cloud');

        console.log('Using Cloud pricing table: ');
        console.dir(cloudPricing, { depth: null });


        console.log(`Validating last ${NUM_TRANSACTIONS} transactions:`);
        for (const transaction of transactions) {
            const data = transaction.currentData;
            const { addonKey, purchaseDetails, licenseId, appEntitlementNumber } = data;
            const {
                hosting,
                vendorAmount,
                saleDate,
                purchasePrice,
                saleType,
                tier,
                maintenanceStartDate,
                maintenanceEndDate
            } = purchaseDetails;

            try {
                const deploymentType = deploymentTypeFromHosting(hosting);
                const pricing = await this.pricingService.getPricing(addonKey, deploymentType);

                const expectedPurchasePrice = this.calculateExpectedPrice({ purchaseDetails, pricing });
                const expectedVendorAmount = expectedPurchasePrice ? expectedPurchasePrice * getDiscountAmount(saleDate, deploymentType) : undefined;

                const actualFormatted = formatCurrency(vendorAmount);
                const expectedFormatted = formatCurrency(expectedVendorAmount);

                const valid = actualFormatted === expectedFormatted ? 'Y' : 'n'

                const license = appEntitlementNumber ? appEntitlementNumber : licenseId;
                console.log(`${valid} ${saleDate} ${saleType} L=${license} ID=${transaction.id}; U=${tier}; Start=${maintenanceStartDate}; End=${maintenanceEndDate}; Expected: ${expectedFormatted}; Actual: ${actualFormatted}`);
            } catch (error: any) {
                console.log(`\nTransaction ${transaction.marketplaceTransactionId}:`);
                console.log(`- Error: ${error.message}`);
            }
        }
    }

    private calculateExpectedPrice(opts: { purchaseDetails: PurchaseDetails, pricing: UserTierPricing[] }): number|undefined {
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
