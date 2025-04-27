import { DataSource } from 'typeorm';
import { Transaction } from '../entities/Transaction';
import { PricingService } from './PricingService';
import { DeploymentType } from './PricingService';

interface TransactionData {
    addonKey: string;
    deploymentType: DeploymentType;
    userCount: number;
    amount: number;
    [key: string]: any;
}

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
        const transactions = await transactionRepository.find({
            order: { createdAt: 'DESC' },
            take: 10
        });

        console.log('\nValidating last 10 transactions:');
        for (const transaction of transactions) {
            const data = transaction.currentData;
            const { addonKey, purchaseDetails } = data;
            const { tier, hosting, vendorAmount, saleDate } = purchaseDetails;

            const deploymentType = deploymentTypeFromHosting(hosting);
            const userCount = userCountFromTier(tier);

            try {
                const pricing = await this.pricingService.getPricing(addonKey, deploymentType);
                const expectedAmount = this.calculateExpectedPrice(pricing, userCount);

                console.log(`\nTransaction ${transaction.marketplaceTransactionId}:`);
                console.log(`- Sale date: ${saleDate}`);
                console.log(`- Addon: ${addonKey}`);
                console.log(`- Deployment: ${deploymentType}`);
                console.log(`- Users: ${userCount}`);
                console.log(`- Actual Amount:   $${vendorAmount}`);
                console.log(`- Expected Amount: $${expectedAmount}`);
                console.log(`- Status: ${vendorAmount === expectedAmount ? 'VALID' : 'INVALID'}`);
            } catch (error: any) {
                console.log(`\nTransaction ${transaction.marketplaceTransactionId}:`);
                console.log(`- Error: ${error.message}`);
            }
        }
    }

    private calculateExpectedPrice(pricing: { userTier: number; cost: number }[], userCount: number): number {
        // Find the appropriate tier for the user count
        const tier = pricing.find(t => userCount <= t.userTier) || pricing[pricing.length - 1];
        return tier.cost;
    }
}