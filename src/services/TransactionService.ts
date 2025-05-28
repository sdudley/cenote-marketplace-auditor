import { Transaction } from '../entities/Transaction';
import { TransactionVersion } from '../entities/TransactionVersion';
import { deepEqual, normalizeObject, computeJsonPaths } from '../utils/objectUtils';
import { printJsonDiff } from '../utils/diffUtils';
import { TransactionData } from '../types/marketplace';
import { IgnoredFieldService } from './IgnoredFieldService';
import { TYPES } from '../config/types';
import { inject, injectable } from 'inversify';
import TransactionDaoService from './TransactionDaoService';

@injectable()
export class TransactionService {
    private ignoredFields: string[] | null = null;

    constructor(
        @inject(TYPES.IgnoredFieldService) private ignoredFieldService: IgnoredFieldService,
        @inject(TYPES.TransactionDaoService) private transactionDaoService: TransactionDaoService
    ) {
    }

    private async getIgnoredFields(): Promise<string[]> {
        if (this.ignoredFields === null) {
            this.ignoredFields = await this.ignoredFieldService.getIgnoredFields('transaction');
        }
        return this.ignoredFields;
    }

    private isProperSubsetOfIgnoredFields(changedPaths: string[]): boolean {
        if (changedPaths.length === 0) return false;
        return changedPaths.every(path => this.ignoredFields?.includes(path));
    }

    async processTransactions(transactions: TransactionData[]): Promise<void> {
        let processedCount = 0;
        let totalCount = transactions.length;
        let modifiedCount = 0;
        let newCount = 0;
        let skippedCount = 0;

        // Initialize ignored fields list
        await this.getIgnoredFields();

        for (const transactionData of transactions) {
            const transactionKey = this.transactionDaoService.getKeyForTransaction(transactionData);
            const existingTransaction = await this.transactionDaoService.getTransactionForKey(transactionKey);
            const entitlementId = this.transactionDaoService.getEntitlementIdForTransaction(transactionData);

            // Normalize the incoming data
            const normalizedData : TransactionData = normalizeObject(transactionData);
            let currentVersion = 1;

            if (existingTransaction) {
                // Compare with current data using deepEqual
                if (!deepEqual(existingTransaction.data, normalizedData)) {
                    // Compute and print JSONPaths of differences
                    const changedPaths = computeJsonPaths(existingTransaction.data, normalizedData);
                    const changedPathsString = changedPaths.join(' | ');

                    // Check if changes are only in ignored fields
                    if (this.isProperSubsetOfIgnoredFields(changedPaths)) {
                        // console.log(`Skipping transaction version creation for transaction #${transactionKey} - changes only in ignored fields: ${changedPathsString}`);
                        skippedCount++;
                        continue;
                    }

                    console.log(`Transaction changed: ${transactionKey}`);
                    console.log('Changed paths:', changedPathsString);
                    printJsonDiff(existingTransaction.data, normalizedData);

                    // Get the current, soon-to-be old version
                    const oldVersion = await this.transactionDaoService.getCurrentTransactionVersion(existingTransaction);

                    currentVersion = oldVersion ? oldVersion.version + 1 : 1;

                    // Create new version
                    const version = new TransactionVersion();
                    version.data = normalizedData;
                    version.transaction = existingTransaction;
                    version.entitlementId = entitlementId;
                    version.diff = changedPaths.length > 0 ? changedPaths.join(' | ') : undefined;
                    version.version = currentVersion;

                    // Set up the version chain
                    if (oldVersion) {
                        version.priorTransactionVersion = oldVersion;
                        oldVersion.nextTransactionVersion = version;

                        // Save both sides of the relationship at once to ensure that the relationship
                        // link is created (because one object needs to exist before the other can be
                        // saved)

                        await this.transactionDaoService.saveTransactionVersions(oldVersion, version);
                    } else {
                        await this.transactionDaoService.saveTransactionVersions(version);
                    }

                    // Update current data
                    existingTransaction.data = normalizedData;
                    existingTransaction.currentVersion = currentVersion;
                    await this.transactionDaoService.saveTransaction(existingTransaction);
                    modifiedCount++;
                }
            } else {
                // Create new transaction
                const transaction = new Transaction();
                transaction.marketplaceTransactionId = transactionKey;
                transaction.data = normalizedData;
                transaction.entitlementId = entitlementId;
                transaction.currentVersion = currentVersion;
                await this.transactionDaoService.saveTransaction(transaction);

                // Create initial version
                const version = new TransactionVersion();
                version.data = normalizedData;
                version.transaction = transaction;
                version.entitlementId = entitlementId;
                version.version = currentVersion;
                await this.transactionDaoService.saveTransactionVersions(version);

                const { saleDate, vendorAmount, tier } = normalizedData.purchaseDetails;
                const customerName = normalizedData.customerDetails.company;
                const { maintenanceStartDate, maintenanceEndDate } = normalizedData.purchaseDetails;

                console.log(`Created new transaction: ${saleDate} $${vendorAmount} for ${entitlementId} (${customerName}) at tier ${tier}, with maintenance from ${maintenanceStartDate} to ${maintenanceEndDate}`);
                newCount++;
            }

            processedCount++;
            if (processedCount % 1000 === 0) {
                console.log(`Processed ${processedCount} of ${totalCount} transactions`);
            }
        }

        console.log(`Completed processing ${totalCount} transactions; ${newCount} were new; ${modifiedCount} were updated; ${skippedCount} were skipped due to ignored fields`);
    }
}