import { DataSource } from 'typeorm';
import { Transaction } from '../entities/Transaction';
import { PricingService, UserTierPricing } from '../services/PricingService';
import { DeploymentType } from '../services/PricingService';
import { components } from '../types/marketplace-api';
import { formatCurrency, deploymentTypeFromHosting, loadLicenseForTransaction } from './validationUtils';
import { PriceCalcOpts, PriceCalculatorService } from './PriceCalculatorService';
import { License } from '../entities/License';

const NUM_TRANSACTIONS = 100;

export type PurchaseDetails = components['schemas']['TransactionPurchaseDetails'];

const MAX_JPY_DRIFT = 0.15; // Atlassian allows generally a 15% buffer for Japanese transactions

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
            // .where('transaction.data->\'purchaseDetails\'->>\'hosting\' = :hosting', { hosting: 'Cloud' })
            .orderBy('transaction.data->\'purchaseDetails\'->>\'saleDate\'', 'DESC')
            .addOrderBy('transaction.created_at', 'DESC')
            .take(NUM_TRANSACTIONS)
            .getMany();

        console.log(`Validating last ${NUM_TRANSACTIONS} transactions:`);
        for (const transaction of transactions) {
            const data = transaction.data;
            const { addonKey, purchaseDetails, licenseId, appEntitlementNumber } = data;
            const {
                hosting,
                vendorAmount,
                licenseType,
                saleDate,
                purchasePrice,
                saleType,
                tier,
                changeInTier,
                oldTier,
                billingPeriod,
                oldBillingPeriod,
                changeInBillingPeriod,
                maintenanceStartDate,
                maintenanceEndDate
            } = purchaseDetails;

            try {
                const licenseId = transaction.entitlementId;

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

                const entitlementId = transaction.entitlementId;

                const pricingOpts: PriceCalcOpts = {
                    pricing,
                    saleType,
                    saleDate,
                    isSandbox,
                    hosting,
                    licenseType,
                    tier,
                    maintenanceStartDate,
                    maintenanceEndDate,
                    billingPeriod
                };

                const price = this.priceCalculatorService.calculateExpectedPrice(pricingOpts);
                const expectedPurchasePrice = price.purchasePrice;
                const expectedVendorAmount = price.vendorPrice;

                const actualFormatted = formatCurrency(vendorAmount);
                const expectedFormatted = formatCurrency(expectedVendorAmount);

                const valid = this.isPriceValid({ vendorAmount, expectedVendorAmount, country: transaction.data.customerDetails.country });

                if (valid) {
                    console.log(`OK L=${licenseId} ${saleType} OK: Expected: ${expectedFormatted}; actual: ${actualFormatted}`);
                    continue;
                }

                console.log(`\n\n*ERROR* L=${licenseId} ${saleType} ID=${transaction.id} Expected price: ${expectedFormatted}; actual purchase price: ${actualFormatted}`);

                {
                    const { pricing, ...rest } = pricingOpts;
                    console.dir(rest, { depth: null });
                }


                // console.log(`${valid} ${saleDate} ${saleType} L=${licenseId} ID=${transaction.id}; U=${tier}; Start=${maintenanceStartDate}; End=${maintenanceEndDate}; Expected: ${expectedFormatted}; Actual: ${actualFormatted}; ActualPurch: ${purchasePrice}`);
                // console.log(`\n`);
            } catch (error: any) {
                console.log(`\nTransaction ${transaction.marketplaceTransactionId}:`);
                console.log(`- Error: ${error.message}`);
            }
        }
    }

    isPriceValid(opts: { expectedVendorAmount: number; vendorAmount: number; country: string; }) : boolean{
        const { expectedVendorAmount, vendorAmount, country } = opts;

        if (country==='Japan') {
            return vendorAmount >= expectedVendorAmount*(1-MAX_JPY_DRIFT) &&
                vendorAmount <= expectedVendorAmount*(1+MAX_JPY_DRIFT) &&
                !(vendorAmount===0 && expectedVendorAmount > 0);
        }

        return (vendorAmount >= expectedVendorAmount-10 &&
                vendorAmount <= expectedVendorAmount+10 &&
                !(vendorAmount===0 && expectedVendorAmount > 0));
    }

}
