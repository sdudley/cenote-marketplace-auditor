import { DataSource } from 'typeorm';
import { Transaction } from '../entities/Transaction';
import { PricingTierResult, PricingService, UserTierPricing } from '../services/PricingService';
import { components } from '../types/marketplace-api';
import { formatCurrency, deploymentTypeFromHosting, loadLicenseForTransaction } from './validationUtils';
import { PriceCalcOpts, PriceCalculatorService, PriceResult } from './PriceCalculatorService';
import { License } from '../entities/License';
import { inject, injectable } from 'inversify';
import { TYPES } from '../config/types';
import { TransactionReconcile } from '../entities/TransactionReconcile';
import { TransactionVersion } from '../entities/TransactionVersion';

const START_DATE = '2024-01-01';

export type PurchaseDetails = components['schemas']['TransactionPurchaseDetails'];

const MAX_JPY_DRIFT = 0.15; // Atlassian allows generally a 15% buffer for Japanese transactions

@injectable()
export class ValidationService {
    constructor(
        @inject(TYPES.DataSource) private dataSource: DataSource,
        @inject(TYPES.PricingService) private pricingService: PricingService,
        @inject(TYPES.PriceCalculatorService) private priceCalculatorService: PriceCalculatorService
    ) {}

    public async validateTransactions(): Promise<void> {
        const transactionRepository = this.dataSource.getRepository(Transaction);
        const licenseRepository = this.dataSource.getRepository(License);
        const transactionReconcileRepo = this.dataSource.getRepository(TransactionReconcile);
        const transactionVersionRepo = this.dataSource.getRepository(TransactionVersion);

        const transactions = await transactionRepository
            .createQueryBuilder('transaction')
            .orderBy("transaction.data->'purchaseDetails'->>'saleDate'", 'DESC')
            .addOrderBy('transaction.created_at', 'DESC')
            .where('transaction.data->\'purchaseDetails\'->>\'saleDate\' >= :startDate', { startDate: START_DATE })
            .getMany();

        console.log(`\nValidating transactions since ${START_DATE}:`);
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
                // Fetch the license information, hosting type, and related pricing info

                const licenseId = transaction.entitlementId;
                const deploymentType = deploymentTypeFromHosting(hosting);
                const pricingTiersResult = await this.pricingService.getPricingTiers({ addonKey, deploymentType, saleDate });

                let isSandbox = false;

                // Load the related license to see if it's a sandbox instance.

                if (vendorAmount===0) {
                    const license = await loadLicenseForTransaction(licenseRepository, transaction);

                    if (license) {
                        transaction.license = license;
                        isSandbox = license.data.installedOnSandbox ? true : false;
                    }
                }

                const entitlementId = transaction.entitlementId;

                // If it is an upgrade, we need to also load the previous purchase and potentially-different
                // pricing tiers for that transaction.

                let previousPurchase : Transaction | undefined;
                let previousPricingResult : PricingTierResult | undefined;

                if (saleType==='Upgrade') {
                    const relatedTransactions = await this.loadRelatedTransactions(entitlementId);
                    previousPurchase = this.getPreviousPurchase({ relatedTransactions, thisTransaction: transaction });

                    if (previousPurchase) {
                        const { saleDate: previousSaleDate } = previousPurchase.data.purchaseDetails;
                        previousPricingResult = await this.pricingService.getPricingTiers({ addonKey, deploymentType, saleDate: previousSaleDate });
                    }
                }

                // Calculate the expected price for the previous purchase, if it exists.

                const previousPricing = previousPurchase && previousPricingResult ? this.calculatePriceForTransaction({ transaction: previousPurchase, isSandbox: false, pricingResult: previousPricingResult }) : undefined;

                // Calculate the expected price for the current transaction.

                const { price, pricingOpts } = this.calculatePriceForTransaction({ transaction, isSandbox, pricingResult: pricingTiersResult, previousPurchase, previousPricing: previousPricing?.price });

                let legacyPrice : PriceResult | undefined = undefined;

                // If there was a legacy pricing tier, calculate the expected price for that too in case this transaction
                // was priced using legacy pricing.

                if (pricingTiersResult.priorTiers) {
                    const legacyPricingResult : PricingTierResult = {
                        tiers: pricingTiersResult.priorTiers,
                        priorTiers: undefined,
                        priorPricingEndDate: undefined
                    };

                    const { price: priorPrice } = this.calculatePriceForTransaction({ transaction, isSandbox: false, pricingResult: legacyPricingResult, previousPurchase, previousPricing: previousPricing?.price });
                    legacyPrice = priorPrice;
                }

                let expectedVendorAmount = price.vendorPrice;

                // Now compare the prices and see if the actual price is what we expect..

                const actualFormatted = formatCurrency(vendorAmount);
                const expectedFormatted = formatCurrency(expectedVendorAmount);

                let { valid, notes } = this.isPriceValid({ vendorAmount, expectedVendorAmount, country: transaction.data.customerDetails.country });

                if (!valid && legacyPrice) {
                    const { valid: legacyValid, notes: legacyNotes } = this.isPriceValid({ vendorAmount, expectedVendorAmount: legacyPrice.vendorPrice, country: transaction.data.customerDetails.country });

                    if (legacyValid) {
                        valid = false;
                        notes += `Price is correct but uses legacy pricing that expired ${pricingTiersResult.priorPricingEndDate}. Current price would be ${expectedFormatted}. `;
                        expectedVendorAmount = legacyPrice.vendorPrice;
                    }
                }

                // Now write reconciliation records for each transaction.

                // Check if a reconcile record already exists for this transaction and version
                const existingReconcile = await transactionReconcileRepo.findOne({
                    where: {
                        transaction: { id: transaction.id },
                        current: true
                    }
                });

                // Don't re-reconcile if no new version has been created

                if (existingReconcile && existingReconcile.transactionVersion===transaction.currentVersion) {
                    continue;
                }

                // Update the existing reconcile record to be non-current

                if (existingReconcile) {
                    existingReconcile.current = false;
                    await transactionReconcileRepo.save(existingReconcile);
                }

                // Create new reconcile record

                if (valid && existingReconcile && !existingReconcile?.reconciled) {
                    notes += 'Price matches but prior version of transaction was not reconciled, so expecting manual approval. ';
                    valid = false;
                }

                if (saleType==='Refund') {
                    notes += 'Refund requires manual approval. ';
                    valid = false;
                }

                const reconcile = new TransactionReconcile();
                reconcile.transaction = transaction;
                reconcile.transactionVersion = transaction.currentVersion;
                reconcile.reconciled = existingReconcile ? valid && existingReconcile.reconciled : valid;
                reconcile.automatic = true;
                reconcile.notes = notes;
                reconcile.actualVendorAmount = vendorAmount;
                reconcile.expectedVendorAmount = expectedVendorAmount;
                reconcile.current = true;
                await transactionReconcileRepo.save(reconcile);

                if (valid) {
                    console.log(`OK ${saleDate} L=${licenseId} ${saleType} OK: Expected: ${expectedFormatted}; actual: ${actualFormatted}`);
                } else {
                    console.log(`\n\n*ERROR* ${saleDate} L=${licenseId} ${saleType} ID=${transaction.id} Expected price: ${expectedFormatted}; actual purchase price: ${actualFormatted}. ${notes}`);
                    {
                        const { pricingResult, ...rest } = pricingOpts;
                        console.dir(rest, { depth: null });
                    }
                }
            } catch (error: any) {
                console.log(`\nTransaction ${transaction.marketplaceTransactionId}:`);
                console.log(`- Error: ${error.message}`);
            }
        }
    }

    private calculatePriceForTransaction(opts: {
        transaction: Transaction;
        isSandbox: boolean;
        pricingResult: PricingTierResult;
        previousPurchase?: Transaction|undefined;
        previousPricing?: PriceResult|undefined;
    }) : { price: PriceResult; pricingOpts: PriceCalcOpts } {
        const { transaction, isSandbox, pricingResult, previousPurchase, previousPricing } = opts;

        const data = transaction.data;
        const { purchaseDetails } = data;

        const pricingOpts: PriceCalcOpts = {
            pricingResult,
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

    private isPriceValid(opts: { expectedVendorAmount: number; vendorAmount: number; country: string; }) : { valid: boolean; notes: string } {
        const { expectedVendorAmount, vendorAmount, country } = opts;

        if (country==='Japan') {
            const valid = vendorAmount >= expectedVendorAmount*(1-MAX_JPY_DRIFT) &&
                vendorAmount <= expectedVendorAmount*(1+MAX_JPY_DRIFT) &&
                !(vendorAmount===0 && expectedVendorAmount > 0);

            return { valid, notes: 'Japan sales priced in JPY are allowed drift' };
        }

        const valid = (vendorAmount >= expectedVendorAmount-10 &&
                vendorAmount <= expectedVendorAmount+10 &&
                !(vendorAmount===0 && expectedVendorAmount > 0));

        return { valid, notes: '' };
    }

    private async loadRelatedTransactions(entitlementId: string) : Promise<Transaction[]> {
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

    private getPreviousPurchase(opts: { relatedTransactions: Transaction[]; thisTransaction: Transaction; }) : Transaction | undefined {
        const { relatedTransactions, thisTransaction } = opts;

        const thisTransactionIndex = relatedTransactions.findIndex(t => t.id === thisTransaction.id);

        if (thisTransactionIndex === -1 || thisTransactionIndex === relatedTransactions.length-1) {
            return undefined;
        }

        const subsequentTransactions = relatedTransactions.slice(thisTransactionIndex+1);
        return subsequentTransactions.find(t => t.data.purchaseDetails.saleType !== 'Refund');
    }
}
