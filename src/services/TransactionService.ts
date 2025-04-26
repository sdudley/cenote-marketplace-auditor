import { DataSource } from 'typeorm';
import { Transaction } from '../entities/Transaction';
import { TransactionVersion } from '../entities/TransactionVersion';
import { deepEqual } from '../utils/objectUtils';

export class TransactionService {
    constructor(private dataSource: DataSource) {}

    async processTransactions(transactions: any[]): Promise<void> {
        for (const transactionData of transactions) {
            console.log('Transaction data:', JSON.stringify(transactionData, null, 2));
            
            const existingTransaction = await this.dataSource.getRepository(Transaction)
                .findOne({ where: { marketplaceTransactionId: transactionData.transactionLineItemId } });

            if (existingTransaction) {
                // Compare with current data using deepEqual
                if (!deepEqual(existingTransaction.currentData, transactionData)) {
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
                transaction.marketplaceTransactionId = transactionData.transactionLineItemId;
                transaction.currentData = transactionData;
                await this.dataSource.getRepository(Transaction).save(transaction);

                // Create initial version
                const version = new TransactionVersion();
                version.data = transactionData;
                version.transaction = transaction;
                await this.dataSource.getRepository(TransactionVersion).save(version);
            }
        }
    }
} 