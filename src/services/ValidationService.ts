import { DataSource } from 'typeorm';
import { Transaction } from '../entities/Transaction';
import { PricingService, UserTierPricing } from './PricingService';
import { DeploymentType } from './PricingService';

interface TransactionData {
    addonKey: string;
    deploymentType: DeploymentType;
    userCount: number;
    amount: number;
    [key: string]: any;
}

const getDiscountAmount = (saleDate: string, deploymentType: DeploymentType): number => {
    return deploymentType==='cloud' ? 0.85 : 0.75;
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

export class ValidationService {
    constructor(
        private dataSource: DataSource,
        private pricingService: PricingService
    ) {}

    async validateTransactions(): Promise<void> {
        const transactionRepository = this.dataSource.getRepository(Transaction);
        const transactions = await transactionRepository
            .createQueryBuilder('transaction')
            .orderBy('transaction."currentData"->\'purchaseDetails\'->\'saleDate\'', 'DESC')
            .addOrderBy('transaction."createdAt"', 'DESC')
            .take(10)
            .getMany();

        console.log('\nValidating last 10 transactions:');
        for (const transaction of transactions) {
            const data = transaction.currentData;
            const { addonKey, purchaseDetails } = data;
            const {
                tier,
                changeInTier,
                oldTier,
                hosting,
                vendorAmount,
                saleDate,
                purchasePrice,
                maintenanceStartDate,
                maintenanceEndDate,
                changeInBillingPeriod,
                billingPeriod,
                oldBillingPeriod
            } = purchaseDetails;

            const deploymentType = deploymentTypeFromHosting(hosting);
            const userCount = userCountFromTier(tier);

            try {
                const pricing = await this.pricingService.getPricing(addonKey, deploymentType);
                const expectedPurchaseAmount = this.calculateExpectedPrice(pricing, userCount);
                const expectedVendorAmount = expectedPurchaseAmount ? expectedPurchaseAmount * getDiscountAmount(saleDate, deploymentType) : undefined;

                console.log(`\nTransaction ${transaction.marketplaceTransactionId}:`);

                console.log('Using pricing table: ');
                console.dir(pricing, { depth: null });


                console.log(`- Sale date: ${saleDate}`);
                console.log(`- Addon: ${addonKey}`);
                console.log(`- Deployment: ${deploymentType}`);
                console.log(`- Users: ${userCount}`);
                console.log(`- Actual Vendor Price:   $${vendorAmount}`);
                console.log(`- Expected Vendor Price: $${expectedVendorAmount}`);
                console.log(`- Status: ${vendorAmount === expectedVendorAmount ? 'VALID' : 'INVALID'}`);
            } catch (error: any) {
                console.log(`\nTransaction ${transaction.marketplaceTransactionId}:`);
                console.log(`- Error: ${error.message}`);
            }
        }
    }

    private calculateExpectedPrice(pricing: UserTierPricing[], userCount: number): number|undefined {
        // Find the appropriate tier for the user count
        const tier = pricing.find(t => userCount <= t.userTier);

        if (!tier) {
            return undefined;
        }
        return tier.cost;
    }
}