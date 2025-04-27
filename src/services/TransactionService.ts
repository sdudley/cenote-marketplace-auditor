import { DataSource } from 'typeorm';
import { Transaction } from '../entities/Transaction';
import { TransactionVersion } from '../entities/TransactionVersion';
import { deepEqual } from '../utils/objectUtils';
import { printJsonDiff } from '../utils/diffUtils';
import { TransactionData } from '../types/marketplace';

export class TransactionService {
    constructor(private dataSource: DataSource) {}

    async processTransactions(transactions: TransactionData[]): Promise<void> {
        let processedCount = 0;
        let totalCount = transactions.length;

        for (const transactionData of transactions) {
            const transactionKey = `${transactionData.transactionLineItemId}:${transactionData.transactionId}`;
            const existingTransaction = await this.dataSource.getRepository(Transaction)
                .findOne({ where: { marketplaceTransactionId: transactionKey } });

            if (existingTransaction) {
                // Compare with current data using deepEqual
                if (!deepEqual(existingTransaction.currentData, transactionData)) {
                    console.log(`Transaction changed: ${transactionKey}`);
                    printJsonDiff(existingTransaction.currentData, transactionData);

                    // Create new version
                    const version = new TransactionVersion();
                    version.data = transactionData;
                    version.transaction = existingTransaction;
                    await this.dataSource.getRepository(TransactionVersion).save(version);

                    // Update current data
                    existingTransaction.currentData = transactionData;
                    await this.dataSource.getRepository(Transaction).save(existingTransaction);
                }
            } else {
                // Create new transaction
                const transaction = new Transaction();
                transaction.marketplaceTransactionId = transactionKey;
                transaction.currentData = transactionData;
                await this.dataSource.getRepository(Transaction).save(transaction);

                // Create initial version
                const version = new TransactionVersion();
                version.data = transactionData;
                version.transaction = transaction;
                await this.dataSource.getRepository(TransactionVersion).save(version);
            }

            processedCount++;
            if (processedCount % 100 === 0) {
                console.log(`Processed ${processedCount} of ${totalCount} transactions`);
            }
        }
        console.log(`Completed processing ${totalCount} transactions`);
    }
}