import { Transaction } from '#common/entities/Transaction';
import { TransactionVersion } from '#common/entities/TransactionVersion';
import { deepEqual, normalizeObject, computeJsonPaths } from '#common/utils/objectUtils';
import { printJsonDiff } from '#common/utils/diffUtils';
import { TransactionData } from '#common/types/marketplace';
import { IgnoredFieldService } from '../services/IgnoredFieldService';
import { TYPES } from '../config/types';
import { inject, injectable } from 'inversify';
import { TransactionDao } from '../database/TransactionDao';
import { isProperSubsetOfFields } from '#common/utils/fieldUtils';
import { TransactionVersionDao } from '#server/database/TransactionVersionDao';
import { SlackService, SlackTransactionData } from '#server/services/SlackService';

const ignoreTransactionFieldsForDiffDisplay = [
    'lastUpdated',
    'partnerDetails.billingContact.',
    'hostEntitlementId',
    'hostEntitlementNumber',
];

@injectable()
export class TransactionJob {
    private ignoredFields: string[] | null = null;

    constructor(
        @inject(TYPES.IgnoredFieldService) private ignoredFieldService: IgnoredFieldService,
        @inject(TYPES.TransactionDao) private transactionDao: TransactionDao,
        @inject(TYPES.TransactionVersionDao) private transactionVersionDao: TransactionVersionDao,
        @inject(TYPES.SlackService) private slackService: SlackService
    ) {
    }

    private async getIgnoredFields(): Promise<string[]> {
        if (this.ignoredFields === null) {
            this.ignoredFields = await this.ignoredFieldService.getIgnoredFields('transaction');
        }
        return this.ignoredFields;
    }

    private isProperSubsetOfIgnoredFields(changedPaths: string[]): boolean {
        return isProperSubsetOfFields(changedPaths, this.ignoredFields);
    }

    async processTransactions(transactions: TransactionData[]): Promise<void> {
        let processedCount = 0;
        let totalCount = transactions.length;
        let modifiedCount = 0;
        let newCount = 0;
        let skippedCount = 0;
        const newTransactions: SlackTransactionData[] = [];

        // Initialize ignored fields list
        await this.getIgnoredFields();

        for (const transactionData of transactions) {
            const transactionKey = this.transactionDao.getKeyForTransaction(transactionData);
            const existingTransaction = await this.transactionDao.getTransactionForKey(transactionKey);
            const entitlementId = this.transactionDao.getEntitlementIdForTransaction(transactionData);

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

                    if (!isProperSubsetOfFields(changedPaths, ignoreTransactionFieldsForDiffDisplay)) {
                        printJsonDiff(existingTransaction.data, normalizedData);
                    }

                    // Get the current highest version number
                    const oldVersionNum = await this.transactionVersionDao.getTransactionHighestVersion(existingTransaction);
                    currentVersion = oldVersionNum + 1;

                    // Create new version
                    const version = new TransactionVersion();
                    version.data = normalizedData;
                    version.transaction = existingTransaction;
                    version.entitlementId = entitlementId;
                    version.diff = changedPaths.length > 0 ? changedPaths.join(' | ') : undefined;
                    version.version = currentVersion;

                    await this.transactionVersionDao.saveTransactionVersions(version);

                    // Update current data
                    existingTransaction.data = normalizedData;
                    existingTransaction.currentVersion = currentVersion;
                    await this.transactionDao.saveTransaction(existingTransaction);
                    modifiedCount++;
                }
            } else {
                // Create new transaction
                const transaction = new Transaction();
                transaction.marketplaceTransactionId = transactionKey;
                transaction.data = normalizedData;
                transaction.entitlementId = entitlementId;
                transaction.currentVersion = currentVersion;
                await this.transactionDao.saveTransaction(transaction);

                // Create initial version
                const version = new TransactionVersion();
                version.data = normalizedData;
                version.transaction = transaction;
                version.entitlementId = entitlementId;
                version.version = currentVersion;
                await this.transactionVersionDao.saveTransactionVersions(version);

                const { saleDate, vendorAmount, tier } = normalizedData.purchaseDetails;
                const customerName = normalizedData.customerDetails.company;
                const { maintenanceStartDate, maintenanceEndDate } = normalizedData.purchaseDetails;

                console.log(`Created new transaction: ${saleDate} $${vendorAmount} for ${entitlementId} (${customerName}) at tier ${tier}, with maintenance from ${maintenanceStartDate} to ${maintenanceEndDate}`);
                newCount++;

                newTransactions.push(this.slackService.mapTransactionForSlack(transaction));
            }

            processedCount++;
        }

        console.log(`Completed processing ${totalCount} transactions; ${newCount} were new; ${modifiedCount} were updated; ${skippedCount} were skipped due to ignored fields`);

        if (newTransactions.length > 0 && processedCount !== newCount) {
            await this.slackService.postNewTransactionsToSlack(newTransactions);
        }
    }
}