import { DataSource, Repository } from 'typeorm';
import { Transaction } from '../entities/Transaction';
import { TransactionVersion } from '../entities/TransactionVersion';
import { deepEqual, normalizeObject, computeJsonPaths } from '../utils/objectUtils';
import { printJsonDiff } from '../utils/diffUtils';
import { TransactionData } from '../types/marketplace';
import { IgnoredFieldService } from './IgnoredFieldService';
import { TYPES } from '../config/types';
import { inject, injectable } from 'inversify';

@injectable()
export class TransactionService {
    private transactionRepository: Repository<Transaction>;
    private transactionVersionRepository: Repository<TransactionVersion>;
    private ignoredFields: string[] | null = null;

    constructor(
        @inject(TYPES.DataSource) private dataSource: DataSource,
        @inject(TYPES.IgnoredFieldService) private ignoredFieldService: IgnoredFieldService
    ) {
        this.transactionRepository = this.dataSource.getRepository(Transaction);
        this.transactionVersionRepository = this.dataSource.getRepository(TransactionVersion);
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
        let skippedCount = 0;

        // Initialize ignored fields list
        await this.getIgnoredFields();

        for (const transactionData of transactions) {
            const transactionKey = `${transactionData.transactionLineItemId}:${transactionData.transactionId}`;
            const existingTransaction = await this.transactionRepository.findOne({ where: { marketplaceTransactionId: transactionKey } });

            const entitlementId = transactionData.appEntitlementNumber || transactionData.licenseId;

            // Normalize the incoming data
            const normalizedData = normalizeObject(transactionData);

            if (existingTransaction) {
                // Compare with current data using deepEqual
                if (!deepEqual(existingTransaction.data, normalizedData)) {
                    // Compute and print JSONPaths of differences
                    const changedPaths = computeJsonPaths(existingTransaction.data, normalizedData);
                    const changedPathsString = changedPaths.join(' | ');

                    // Check if changes are only in ignored fields
                    if (this.isProperSubsetOfIgnoredFields(changedPaths)) {
                        console.log(`Skipping transaction version creation for transaction #${transactionKey} - changes only in ignored fields: ${changedPathsString}`);
                        skippedCount++;
                        continue;
                    }

                    console.log(`Transaction changed: ${transactionKey}`);
                    console.log('Changed paths:', changedPathsString);
                    printJsonDiff(existingTransaction.data, normalizedData);

                    // Get the current, soon-to-be old version
                    const oldVersion = await this.transactionVersionRepository.findOne({
                        where: { transaction: existingTransaction },
                        order: { createdAt: 'DESC' }
                    });

                    // Create new version
                    const version = new TransactionVersion();
                    version.data = normalizedData;
                    version.transaction = existingTransaction;
                    version.entitlementId = entitlementId;
                    version.diff = changedPaths.length > 0 ? changedPaths.join(' | ') : undefined;

                    // Set up the version chain
                    if (oldVersion) {
                        version.priorTransactionVersion = oldVersion;
                        oldVersion.nextTransactionVersion = version;
                        await this.transactionVersionRepository.save(oldVersion);
                    }

                    await this.transactionVersionRepository.save(version);

                    // Update current data
                    existingTransaction.data = normalizedData;
                    await this.transactionRepository.save(existingTransaction);
                    modifiedCount++;
                }
            } else {
                // Create new transaction
                const transaction = new Transaction();
                transaction.marketplaceTransactionId = transactionKey;
                transaction.data = normalizedData;
                transaction.entitlementId = entitlementId;
                await this.transactionRepository.save(transaction);

                // Create initial version
                const version = new TransactionVersion();
                version.data = normalizedData;
                version.transaction = transaction;
                version.entitlementId = entitlementId;
                await this.transactionVersionRepository.save(version);
            }

            processedCount++;
            if (processedCount % 1000 === 0) {
                console.log(`Processed ${processedCount} of ${totalCount} transactions`);
            }
        }
        console.log(`Completed processing ${totalCount} transactions; ${modifiedCount} were updated; ${skippedCount} were skipped due to ignored fields`);
    }
}