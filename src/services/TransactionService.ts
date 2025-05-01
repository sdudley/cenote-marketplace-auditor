import { DataSource, Repository } from 'typeorm';
import { Transaction } from '../entities/Transaction';
import { TransactionVersion } from '../entities/TransactionVersion';
import { deepEqual, normalizeObject, computeJsonPaths } from '../utils/objectUtils';
import { printJsonDiff } from '../utils/diffUtils';
import { TransactionData } from '../types/marketplace';

export class TransactionService {
    private transactionRepository: Repository<Transaction>;
    private transactionVersionRepository: Repository<TransactionVersion>;

    constructor(private dataSource: DataSource) {
        this.transactionRepository = this.dataSource.getRepository(Transaction);
        this.transactionVersionRepository = this.dataSource.getRepository(TransactionVersion);
    }

    async processTransactions(transactions: TransactionData[]): Promise<void> {
        let processedCount = 0;
        let totalCount = transactions.length;
        let modifiedCount = 0;

        for (const transactionData of transactions) {
            const transactionKey = `${transactionData.transactionLineItemId}:${transactionData.transactionId}`;
            const existingTransaction = await this.transactionRepository.findOne({ where: { marketplaceTransactionId: transactionKey } });

            const entitlementId = transactionData.appEntitlementNumber || transactionData.licenseId;

            // Normalize the incoming data
            const normalizedData = normalizeObject(transactionData);

            if (existingTransaction) {
                // Compare with current data using deepEqual
                if (!deepEqual(existingTransaction.currentData, normalizedData)) {
                    console.log(`Transaction changed: ${transactionKey}`);
                    printJsonDiff(existingTransaction.currentData, normalizedData);

                    // Compute and print JSONPaths of differences
                    const changedPaths = computeJsonPaths(existingTransaction.currentData, normalizedData);
                    console.log('Changed paths:', changedPaths.join(' | '));

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
                    existingTransaction.currentData = normalizedData;
                    await this.transactionRepository.save(existingTransaction);
                    modifiedCount++;
                }
            } else {
                // Create new transaction
                const transaction = new Transaction();
                transaction.marketplaceTransactionId = transactionKey;
                transaction.currentData = normalizedData;
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
        console.log(`Completed processing ${totalCount} transactions; ${modifiedCount} were updated`);
    }
}