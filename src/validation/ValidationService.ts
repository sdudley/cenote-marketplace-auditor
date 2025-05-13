import { Transaction } from '../entities/Transaction';
import { PricingTierResult, PricingService, UserTierPricing } from '../services/PricingService';
import { components } from '../types/marketplace-api';
import { formatCurrency, deploymentTypeFromHosting, loadLicenseForTransaction } from './validationUtils';
import { PriceCalcOpts, PriceCalculatorService, PriceResult } from './PriceCalculatorService';
import { inject, injectable } from 'inversify';
import { TYPES } from '../config/types';
import TransactionDaoService from '../services/TransactionDaoService';
import TransactionReconcileDaoService from '../services/TransactionReconcileDaoService';
import { LicenseDaoService } from '../services/LicenseDaoService';

const START_DATE = '2024-01-01';
const MAX_JPY_DRIFT = 0.15; // Atlassian generally allows a 15% buffer for Japanese Yen transactions

export type PurchaseDetails = components['schemas']['TransactionPurchaseDetails'];

interface PriceWithPricingOpts {
    price: PriceResult;
    pricingOpts: PriceCalcOpts;
}

@injectable()
export class ValidationService {
    constructor(
        @inject(TYPES.PricingService) private pricingService: PricingService,
        @inject(TYPES.PriceCalculatorService) private priceCalculatorService: PriceCalculatorService,
        @inject(TYPES.TransactionDaoService) private transactionDaoService: TransactionDaoService,
        @inject(TYPES.TransactionReconcileDaoService) private transactionReconcileDaoService: TransactionReconcileDaoService,
        @inject(TYPES.LicenseDaoService) private licenseDaoService: LicenseDaoService
    ) {
    }

    public async validateTransactions(): Promise<void> {
        const transactions = await this.transactionDaoService.getTransactionsBySaleDate(START_DATE);
        console.log(`\nValidating transactions since ${START_DATE}:`);

        for (const transaction of transactions) {

            if (false) {//transaction.entitlementId !== 'SEN-xxxxxxx') {
                // problem with this transaction:
                // the prior period license (from which we are upgrading) was also calculated using
                // the legacy pricing period, so we need to figure out how to determine that this was
                // the case. Recursive evaluation of the prior transaction?
                continue;
            }

            try {
                await this.validateOneTransaction(transaction);
            } catch (error: any) {
                console.log(`\nTransaction ${transaction.marketplaceTransactionId}:`);
                console.log(`- Error: ${error.message}`);
            }
        }
    }

    private async validateOneTransaction(transaction: Transaction): Promise<void> {
        const { data, entitlementId } = transaction;
        const { addonKey, purchaseDetails } = data;
        const {
            vendorAmount,
            saleType,
            saleDate
        } = purchaseDetails;

        const deploymentType = deploymentTypeFromHosting(purchaseDetails.hosting);
        const pricingTiersResult = await this.pricingService.getPricingTiers({ addonKey, deploymentType, saleDate });
        const isSandbox = await this.isSandbox({ vendorAmount, transaction });

        // If it is an upgrade, we need to also load the previous purchase and potentially-different
        // pricing tiers for that transaction.

        let previousPurchase : Transaction | undefined;
        let previousPricingTiersResult : PricingTierResult | undefined;

        if (saleType==='Upgrade') {
            const relatedTransactions = await this.transactionDaoService.loadRelatedTransactions(entitlementId);
            previousPurchase = this.getPreviousPurchase({ relatedTransactions, thisTransaction: transaction });

            if (previousPurchase) {
                const { saleDate: previousSaleDate } = previousPurchase.data.purchaseDetails;
                previousPricingTiersResult = await this.pricingService.getPricingTiers({ addonKey, deploymentType, saleDate: previousSaleDate });
            }
        }

        // Calculate the expected price for the previous purchase, if it exists.

        const previousPricing = previousPurchase && previousPricingTiersResult ? this.calculatePriceForTransaction({ transaction: previousPurchase, isSandbox: false, pricingTierResult: previousPricingTiersResult }) : undefined;

        // Calculate the expected price for the current transaction.

        const { price, pricingOpts } = this.calculatePriceForTransaction({ transaction, isSandbox, pricingTierResult: pricingTiersResult, previousPurchase, previousPricing: previousPricing?.price });

        // Also calculate the expected price if this were a legacy transaction.
        const legacyPrice = this.calculateLegacyPrice({ transaction, pricingTiersResult, previousPurchase, previousPricing: previousPricing?.price });

        let expectedVendorAmount = price.vendorPrice;

        // TRY TO SEE IF WE HAVE ANY EXPERT RESALES TO PRICE-MATCH

        // Now compare the prices and see if the actual price is what we expect..

        const actualFormatted = formatCurrency(vendorAmount);
        const expectedFormatted = formatCurrency(expectedVendorAmount);

        // First, check to see if the priec is valid according to current pricing.

        let { valid, notes } = this.isPriceValid({ vendorAmount, expectedVendorAmount, country: transaction.data.customerDetails.country });

        // If it's not valid, also check to see if it could be valid according to legacy pricing.

        if (!valid && legacyPrice) {
            const { valid: legacyValid, notes: legacyNotes } = this.isPriceValid({ vendorAmount, expectedVendorAmount: legacyPrice.vendorPrice, country: transaction.data.customerDetails.country });

            if (legacyValid) {
                valid = false;
                notes.push(`Price is correct but uses legacy pricing that expired ${pricingTiersResult.priorPricingEndDate}. Current price would be ${expectedFormatted}.`);
                expectedVendorAmount = legacyPrice.vendorPrice;
            }
        }

        // Refunds always require approval

        if (saleType==='Refund') {
            notes.push('Refund requires manual approval.');
            valid = false;
        }

        // Check if a reconcile record already exists for this transaction and version

        const existingReconcile = await this.transactionReconcileDaoService.getTransactionReconcileForTransaction(transaction);

        // Don't re-reconcile if no new version has been created

        if (existingReconcile && existingReconcile.transactionVersion===transaction.currentVersion) {
            return;
        }

        // Record the reconcile record

        await this.transactionReconcileDaoService.recordReconcile({ transaction, existingReconcile, valid, notes, vendorAmount, expectedVendorAmount });

        if (valid) {
            console.log(`OK ${saleDate} L=${entitlementId} ${saleType} OK: Expected: ${expectedFormatted}; actual: ${actualFormatted}`);
        } else {
            console.log(`\n\n*ERROR* ${saleDate} L=${entitlementId} ${saleType} ID=${transaction.id} Expected price: ${expectedFormatted}; actual purchase price: ${actualFormatted}. ${notes}`);
            {
                const { pricingTierResult: pricingResult, ...rest } = pricingOpts;
                console.dir(rest, { depth: null });
            }
        }
    }

    // Returns true if the transaction represents a sandbox instance

    private async isSandbox(opts: { vendorAmount: number; transaction: Transaction }) : Promise<boolean> {
        const { vendorAmount, transaction } = opts;

        if (vendorAmount !== 0) {
            return false;
        }

        const license = await this.licenseDaoService.loadLicenseForTransaction(transaction);

        if (!license) {
            return false;
        }

        return license.data.installedOnSandbox ? true : false;
    }

    /**
     * Calculate the expected price of this transaction if we were to use the legacy pricing tiers rather than the current ones,
     * because Atlassian often sells with legacy pricing past the pricing transition date.
     */
    private calculateLegacyPrice(opts: { transaction: Transaction; pricingTiersResult: PricingTierResult; previousPurchase?: Transaction|undefined; previousPricing?: PriceResult|undefined; }) : PriceResult | undefined {
        const { transaction, pricingTiersResult, previousPurchase, previousPricing } = opts;

        // If there are no legacy pricing tiers, there is nothing to calculate.

        if (!pricingTiersResult.priorTiers) {
            return undefined;
        }

        // If there was a legacy pricing tier, calculate the expected price for that too in case this transaction
        // was priced using legacy pricing.

        const legacyPricingResult : PricingTierResult = {
            tiers: pricingTiersResult.priorTiers,
            priorTiers: undefined,
            priorPricingEndDate: undefined
        };

        const { price: priorPrice } = this.calculatePriceForTransaction({ transaction, isSandbox: false, pricingTierResult: legacyPricingResult, previousPurchase, previousPricing });
        return priorPrice;
    }


    // Invokes the PriceCalculatorService to calculate the expected price for a transaction.

    private calculatePriceForTransaction(opts: {
        transaction: Transaction;
        isSandbox: boolean;
        pricingTierResult: PricingTierResult;
        previousPurchase?: Transaction|undefined;
        previousPricing?: PriceResult|undefined;
    }) : PriceWithPricingOpts {
        const { transaction, isSandbox, pricingTierResult, previousPurchase, previousPricing } = opts;
        const { purchaseDetails } = transaction.data;

        const pricingOpts: PriceCalcOpts = {
            pricingTierResult: pricingTierResult,
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

        const price = this.priceCalculatorService.calculateExpectedPrice(pricingOpts);
        return { price, pricingOpts };
    }

    // Tests to see if the expected price is within a reasonable range of the actual price, given
    // Atlassian's pricing logic.

    private isPriceValid(opts: { expectedVendorAmount: number; vendorAmount: number; country: string; }) : { valid: boolean; notes: string[] } {
        const { expectedVendorAmount, vendorAmount, country } = opts;

        if (country==='Japan') {
            const valid = vendorAmount >= expectedVendorAmount*(1-MAX_JPY_DRIFT) &&
                vendorAmount <= expectedVendorAmount*(1+MAX_JPY_DRIFT) &&
                !(vendorAmount===0 && expectedVendorAmount > 0);

            return { valid, notes: ['Japan sales priced in JPY are allowed drift.'] };
        }

        const valid = (vendorAmount >= expectedVendorAmount-10 &&
                vendorAmount <= expectedVendorAmount+10 &&
                !(vendorAmount===0 && expectedVendorAmount > 0));

        return { valid, notes: [] };
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
