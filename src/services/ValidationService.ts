import { DataSource } from 'typeorm';
import { Transaction } from '../entities/Transaction';
import { PricingService, UserTierPricing } from './PricingService';
import { DeploymentType } from './PricingService';
import { components } from '../types/marketplace-api';

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

export class ValidationService {
    constructor(
        private dataSource: DataSource,
        private pricingService: PricingService
    ) {}

    async validateTransactions(): Promise<void> {
        const NUM_TRANSACTIONS = 20;

        const transactionRepository = this.dataSource.getRepository(Transaction);
        const transactions = await transactionRepository
            .createQueryBuilder('transaction')
            .where('transaction."currentData"->\'purchaseDetails\'->>\'hosting\' = :hosting', { hosting: 'Cloud' })
            .orderBy('transaction."currentData"->\'purchaseDetails\'->>\'saleDate\'', 'DESC')
            .addOrderBy('transaction."createdAt"', 'DESC')
            .take(NUM_TRANSACTIONS)
            .getMany();

        console.log(`\nValidating last ${NUM_TRANSACTIONS} transactions:`);
        for (const transaction of transactions) {
            const data = transaction.currentData;
            const { addonKey, purchaseDetails } = data;
            const {
                hosting,
                vendorAmount,
                saleDate,
                purchasePrice,
                tier
            } = purchaseDetails;

            try {
                const deploymentType = deploymentTypeFromHosting(hosting);
                const pricing = await this.pricingService.getPricing(addonKey, deploymentType);
                const expectedPurchasePrice = this.calculateExpectedPrice({ purchaseDetails, pricing });
                const expectedVendorAmount = expectedPurchasePrice ? expectedPurchasePrice * getDiscountAmount(saleDate, deploymentType) : undefined;

                console.log(`\nTransaction ID=${transaction.id}; Invoice=${transaction.marketplaceTransactionId}:`);

                console.log('Using pricing table: ');
                console.dir(pricing, { depth: null });


                console.log(`- Sale date: ${saleDate}`);
                console.log(`- Addon: ${addonKey}`);
                console.log(`- Deployment: ${deploymentType}`);
                console.log(`- Users: ${tier}`);
                console.log(`- Actual Purchase Price:   $${purchasePrice}`);
                console.log(`- Expected Purchase Price: $${expectedPurchasePrice}`);
                console.log(`- Actual Vendor Price:     $${vendorAmount}`);
                console.log(`- Expected Vendor Price:   $${expectedVendorAmount}`);
                console.log(`- Status: ${vendorAmount === expectedVendorAmount ? 'VALID' : 'INVALID'}`);
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

        if (tierIndex === 0) {
            // Fixed pricing for first tier (up to 10 users)
            basePrice = cost;
        } else {
            const priorPricingTier = pricing[tierIndex - 1];

            const usersInNewTier = userCount - priorPricingTier.userTier;
            const userDifferencePerTier = pricingTier.userTier - priorPricingTier.userTier;
            const pricePerUserInNewTier = (pricingTier.cost - priorPricingTier.cost) / userDifferencePerTier;
            basePrice = priorPricingTier.cost + (pricePerUserInNewTier * usersInNewTier);
        }

        basePrice = basePrice / (billingPeriod === 'Monthly' ? 10 : basePrice / 12);

        if (licenseType==='ACADEMIC') {
            basePrice = basePrice * ACADEMIC_PRICE_RATIO;
        }

        return basePrice;
    }
}
