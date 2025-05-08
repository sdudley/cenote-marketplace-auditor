import { DataSource } from 'typeorm';
import { Transaction } from '../entities/Transaction';
import { PricingService, UserTierPricing } from '../services/PricingService';
import { DeploymentType } from '../services/PricingService';
import { components } from '../types/marketplace-api';
import { formatCurrency, deploymentTypeFromHosting, loadLicenseForTransaction } from './validationUtils';
import { PriceCalcOpts, PriceCalculatorService, PriceResult } from './PriceCalculatorService';
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

            // if (transaction.entitlementId !== 'SEN-xxxxxxx') {
            //     continue;
            // }

            const data = transaction.data;
            const { addonKey, purchaseDetails } = data;
            const {
                hosting,
                vendorAmount,
                saleType,
                saleDate
            } = purchaseDetails;

            try {
                const licenseId = transaction.entitlementId;

                const deploymentType = deploymentTypeFromHosting(hosting);
                const pricing = await this.pricingService.getPricing({ addonKey, deploymentType, saleDate });

                let isSandbox = false;

                if (vendorAmount===0) {
                    const license = await loadLicenseForTransaction(licenseRepository, transaction);

                    if (license) {
                        transaction.license = license;
                        isSandbox = license.data.installedOnSandbox ? true : false;
                    }
                }

                const entitlementId = transaction.entitlementId;


                let previousPurchase : Transaction | undefined;

                if (saleType==='Upgrade') {
                    const relatedTransactions = await this.loadRelatedTransactions(entitlementId);
                    previousPurchase = this.getPreviousPurchase({ relatedTransactions, thisTransaction: transaction });
                }

                const previousPricing = previousPurchase ? this.calculatePriceForTransaction({ transaction: previousPurchase, isSandbox: false, pricing }) : undefined;

                const { price, pricingOpts } = this.calculatePriceForTransaction({ transaction, isSandbox, pricing, previousPurchase, previousPricing: previousPricing?.price });
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

    calculatePriceForTransaction(opts: {
        transaction: Transaction;
        isSandbox: boolean;
        pricing: UserTierPricing[];
        previousPurchase?: Transaction|undefined;
        previousPricing?: PriceResult|undefined;
    }) : { price: PriceResult; pricingOpts: PriceCalcOpts } {
        const { transaction, isSandbox, pricing, previousPurchase, previousPricing } = opts;

        const data = transaction.data;
        const { purchaseDetails } = data;

        const pricingOpts: PriceCalcOpts = {
            pricing,
            saleType: purchaseDetails.saleType,
            saleDate: purchaseDetails.saleDate,
            isSandbox,
            hosting: purchaseDetails.hosting,
            licenseType: purchaseDetails.licenseType,
            tier: purchaseDetails.tier,
            maintenanceStartDate: purchaseDetails.maintenanceStartDate,
            maintenanceEndDate: purchaseDetails.maintenanceEndDate,
            billingPeriod: purchaseDetails.billingPeriod,
            previousPurchase,
            previousPricing
        };

        // Also add new feed for renewal events: https://marketplace.atlassian.com/rest/2/vendors/1215549/reporting/sales/metrics/renewal/details

        const price = this.priceCalculatorService.calculateExpectedPrice(pricingOpts);
        return { price, pricingOpts };
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

    async loadRelatedTransactions(entitlementId: string) : Promise<Transaction[]> {
        const transactionRepository = this.dataSource.getRepository(Transaction);

        const transactions = await transactionRepository
            .createQueryBuilder('transaction')
            .where('transaction.entitlementId = :entitlementId', { entitlementId })
            .orderBy('transaction.data->\'purchaseDetails\'->>\'saleDate\'', 'DESC')
            .addOrderBy('transaction.created_at', 'DESC')
            .getMany();

        return transactions;
    }

    // This function gets the most recent transaction that is not a refund. This may not be entirely correct,
    // but if the purchase history is more complicated, then it probably needs manual review anyway.
    //
    // The relatedTransactions array must be sorted by descending sale date.
    //
    // TODO FIXME: what if multiple transactions created on the same day?

    getPreviousPurchase(opts: { relatedTransactions: Transaction[]; thisTransaction: Transaction; }) : Transaction | undefined {
        const { relatedTransactions, thisTransaction } = opts;

        const thisTransactionIndex = relatedTransactions.findIndex(t => t.id === thisTransaction.id);

        if (thisTransactionIndex === -1 || thisTransactionIndex === relatedTransactions.length-1) {
            return undefined;
        }

        const subsequentTransactions = relatedTransactions.slice(thisTransactionIndex+1);
        return subsequentTransactions.find(t => t.data.purchaseDetails.saleType !== 'Refund');
    }
}
