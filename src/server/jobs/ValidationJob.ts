import { Transaction } from '#common/entities/Transaction';
import { components } from '#common/types/marketplace-api';
import { formatCurrency } from '#common/utils/formatCurrency';
import { inject, injectable } from 'inversify';
import { TYPES } from '../config/types';
import { TransactionDao } from '../database/TransactionDao';
import { TransactionReconcileDao } from '../database/TransactionReconcileDao';
import { LicenseDao } from '../database/LicenseDao';
import { ResellerDao } from '../database/ResellerDao';
import { TransactionAdjustmentDao } from '../database/TransactionAdjustmentDao';
import { PreviousTransactionService } from '../services/PreviousTransactionService';
import { TransactionVersionDao } from '#server/database/TransactionVersionDao';
import { TransactionValidationService } from '../services/transactionValidation/TransactionValidationService';
import { TransactionValidationResult } from '../services/transactionValidation/types';
import { TransactionVersion } from '#common/entities/TransactionVersion';

const DEFAULT_START_DATE = '2024-01-01';

// Do not reconcile automatically if legacy price used this late:
// Allow for at least 60-day grandfathering, 90-day quote, 30-day purchase
const ALERT_DAYS_AFTER_PRICING_CHANGE = 180;

// TODO: evaluate licenses against transactions
// License end dates that extend those of transactions (see SQL queries)
// License sizes that do not match transaction sizes

export type PurchaseDetails = components['schemas']['TransactionPurchaseDetails'];

@injectable()
export class ValidationJob {
    constructor(
        @inject(TYPES.TransactionValidationService) private transactionValidationService: TransactionValidationService,
        @inject(TYPES.TransactionDao) private transactionDao: TransactionDao,
        @inject(TYPES.TransactionReconcileDao) private transactionReconcileDao: TransactionReconcileDao,
        @inject(TYPES.LicenseDao) private licenseDao: LicenseDao,
        @inject(TYPES.ResellerDao) private resellerDao: ResellerDao,
        @inject(TYPES.TransactionAdjustmentDao) private transactionAdjustmentDao: TransactionAdjustmentDao,
        @inject(TYPES.PreviousTransactionService) private previousTransactionService: PreviousTransactionService,
        @inject(TYPES.TransactionVersionDao) private transactionVersionDao: TransactionVersionDao
    ) {
    }

    /**
     * Validate all transactions in the database
     * @param startDate Optional start date to filter transactions
     */
    async validateTransactions(startDate?: string|null): Promise<void> {
        const actualStartDate = startDate ?? DEFAULT_START_DATE;
        const transactions = await this.transactionDao.getTransactionsBySaleDate(actualStartDate);

        console.log(`\n=== Validating transactions since ${actualStartDate} ===`);

        let validCount = 0;
        let expectedPriceCount = 0;

        for (const transaction of transactions) {
            try {
                const validationResult = await this.transactionValidationService.transactionValidator(transaction);

                if (validationResult) {
                    await this.recordTransactionReconcile({ validationResult, transaction });
                    await this.logTransactionValidation({ validationResult, transaction });

                    if (validationResult.isExpectedPrice) {
                        expectedPriceCount++;
                    }

                    if (validationResult.valid) {
                        validCount++;
                    }
                }
            } catch (error: any) {
                console.log(`\nTransaction ${transaction.marketplaceTransactionId}:`);
                console.log(`- Error: ${error.message}`);
            }
        }

        const invalidCount = transactions.length - expectedPriceCount;

        console.log(`\nSummary: ${transactions.length} transactions; ${expectedPriceCount} have expected price; ${validCount} are reconciled; ${invalidCount} need correction.`);
    }

    private async recordTransactionReconcile(opts: { validationResult: TransactionValidationResult, transaction: Transaction; }) : Promise<void> {
        const { validationResult, transaction } = opts;
        const { valid: currentValid, notes, vendorAmount, expectedVendorAmount } = validationResult;

        let reconciled = currentValid;

        // Check if a reconcile record already exists for this transaction and version

        const existingReconcile = await this.transactionReconcileDao.getTransactionReconcileForTransaction(transaction);

        // Don't re-reconcile if no new version has been created

        if (existingReconcile && existingReconcile.transactionVersion===transaction.currentVersion) {
            return;
        }

        // Now fetch the prior version of the transaction, if it exists

        let priorVersion : TransactionVersion | null = null;

        if (transaction.currentVersion > 1) {
            priorVersion = await this.transactionVersionDao.getTransactionVersionByNumber({
                transactionId: transaction.id,
                version: transaction.currentVersion - 1
            });

            if (!priorVersion) {
                throw new Error(`Could not find prior version of transaction ${transaction.id} (expected to find version ${transaction.currentVersion - 1})`);
            }
        }

        if (existingReconcile) {
            if (reconciled && !existingReconcile.reconciled) {
                notes.push('Price now matches, but prior version of transaction was not reconciled, so requiring manual approval.');
                reconciled = false;
            }

            if (priorVersion) {
                const notes = await this.transactionValidationService.generateNotesIfTransactionHasImportantMutations({ transaction, priorVersion, validationResult });

                if (notes.length > 0) {
                    notes.forEach(n => notes.push(n));
                    reconciled = false;
                }
            }
        }

        if (reconciled) {
            const actualAdjustments = await this.transactionAdjustmentDao.getAdjustmentsForTransaction(transaction)
            const totalAdjustment = actualAdjustments.reduce((acc, adjustment) => acc + (adjustment.purchasePriceDiscount || 0), 0);

            let autoReconcileMessage = `Automatically reconciled with vendor price of ${formatCurrency(vendorAmount)}`;

            const { expectedDiscountApplied, hasActualAdjustments } = validationResult;

            if (expectedDiscountApplied !== 0 && !hasActualAdjustments) {
                autoReconcileMessage += `; includes expected discount of ${formatCurrency(validationResult.expectedDiscountApplied)}`;
            } else if (totalAdjustment !== 0) {
                autoReconcileMessage += `; includes manual transaction adjustments of ${formatCurrency(totalAdjustment)}`;
            }

            notes.push(autoReconcileMessage);
        }

        await this.transactionReconcileDao.recordReconcile({
            transaction,
            existingReconcile,
            reconciled,
            notes,
            actualVendorAmount:
            vendorAmount,
            expectedVendorAmount,
            automatic: true
        });
    }


    private async logTransactionValidation(opts: { validationResult: TransactionValidationResult; transaction: Transaction; }) {
        const { validationResult, transaction } = opts;

        const { valid, notes, vendorAmount, expectedVendorAmount, pricingOpts, price } = validationResult;

        const { data, entitlementId } = transaction;
        const { purchaseDetails } = data;
        const {
            saleType,
            saleDate,
            purchasePrice
        } = purchaseDetails;


        const actualVendorFormatted = formatCurrency(vendorAmount);
        const expectedVendorFormatted = formatCurrency(expectedVendorAmount);

        const actualPurchase = purchasePrice;
        const expectedPurchase = price.purchasePrice;

        const actualPurchaseFormatted = formatCurrency(actualPurchase);
        const expectedPurchaseFormatted = formatCurrency(expectedPurchase);

        if (valid) {
            //console.log(`OK      ${saleDate} ${saleType.padEnd(7)} L=${entitlementId.padEnd(17)} Expected vendor: ${expectedVendorFormatted.padEnd(10)}; actual vendor: ${actualVendorFormatted.padEnd(10)} ${notes.join('; ')}`);
        } else {
            const diff = expectedPurchase - actualPurchase;
            console.log(`*ERROR* ${saleDate} ${saleType.padEnd(7)} L=${entitlementId.padEnd(17)} Expected vendor: ${expectedVendorFormatted.padEnd(10)}; actual vendor: ${actualVendorFormatted.padEnd(10)}; expected purchase: ${expectedPurchaseFormatted.padEnd(10)}; actual purchase: ${actualPurchaseFormatted.padEnd(10)}; difference=${formatCurrency(diff)}; txID=${transaction.id}; Customer=${transaction.data.customerDetails.company}; Partner=${transaction.data.partnerDetails?.partnerName}; ${notes.join('; ')}`);
            // console.debug(`Pricing opts: `);
            // console.dir(pricingOpts, { depth: 1 });

            console.log(`To accept adjustment: npm run add-transaction-adjustment -- ${transaction.id} ${diff.toFixed(2)} ""\n\n`);
        }
    }
}