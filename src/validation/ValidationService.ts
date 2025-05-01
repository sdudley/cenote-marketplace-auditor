import { DataSource } from 'typeorm';
import { Transaction } from '../entities/Transaction';
import { PricingService, UserTierPricing } from '../services/PricingService';
import { DeploymentType } from '../services/PricingService';
import { components } from '../types/marketplace-api';
import { CLOUD_DISCOUNT_RATIO, DC_DISCOUNT_RATIO, ACADEMIC_PRICE_RATIO } from './constants';
import { formatCurrency, deploymentTypeFromHosting, loadLicenseForTransaction } from './validationUtils';
import { PriceCalculatorService } from './PriceCalculatorService';
import { License } from '../entities/License';

const NUM_TRANSACTIONS = 50;

export type PurchaseDetails = components['schemas']['TransactionPurchaseDetails'];

// Vendor discount amounts (after Atlassian share)
const getDiscountAmount = (saleDate: string, deploymentType: DeploymentType): number => {
    return deploymentType==='cloud' ? CLOUD_DISCOUNT_RATIO : DC_DISCOUNT_RATIO;
};


export class ValidationService {
    constructor(
        private dataSource: DataSource,
        private pricingService: PricingService,
        private priceCalculatorService: PriceCalculatorService
    ) {}

    async validateTransactions(): Promise<void> {
        const transactionRepository = this.dataSource.getRepository(Transaction);
        const licenseRepository = this.dataSource.getRepository(License);

        const transactions = await transactionRepository
            .createQueryBuilder('transaction')
           // .leftJoinAndSelect("transaction.license", "license")
            .where('transaction.data->\'purchaseDetails\'->>\'hosting\' = :hosting', { hosting: 'Cloud' })
            .orderBy('transaction.data->\'purchaseDetails\'->>\'saleDate\'', 'DESC')
            .addOrderBy('transaction.created_at', 'DESC')
            .take(NUM_TRANSACTIONS)
            .getMany();

        const cloudPricing = await this.pricingService.getPricing('com.arsenale.plugins.lockpoint', 'cloud');

        console.log('Using Cloud pricing table: ');
        console.dir(cloudPricing, { depth: null });

        console.log(`Validating last ${NUM_TRANSACTIONS} transactions:`);
        for (const transaction of transactions) {
            const data = transaction.data;
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

                let isSandbox = false;

                if (vendorAmount===0) {
                    const license = await loadLicenseForTransaction(licenseRepository, transaction);

                    if (license) {
                        transaction.license = license;
                        isSandbox = license.data.installedOnSandbox ? true : false;
                    }
                }

                const expectedPurchasePrice = this.priceCalculatorService.calculateExpectedPrice({ purchaseDetails, pricing, isSandbox });
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
}
