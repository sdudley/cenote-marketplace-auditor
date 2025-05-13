import { DataSource, Repository } from 'typeorm';
import { Transaction } from '../entities/Transaction';
import { TransactionAdjustment } from '../entities/TransactionAdjustment';
import { inject, injectable } from 'inversify';
import { TYPES } from '../config/types';

@injectable()
export class TransactionAdjustmentDaoService {
    private transactionAdjustmentRepo: Repository<TransactionAdjustment>;

    constructor(
        @inject(TYPES.DataSource) private dataSource: DataSource
    ) {
        this.transactionAdjustmentRepo = this.dataSource.getRepository(TransactionAdjustment);
    }

    /**
     * Get the adjustment for a transaction, if one exists
     */
    async getAdjustmentForTransaction(transaction: Transaction): Promise<TransactionAdjustment | null> {
        return this.transactionAdjustmentRepo.findOne({
            where: {
                transaction: { id: transaction.id }
            }
        });
    }

    /**
     * Save a transaction adjustment. If an adjustment already exists for this transaction,
     * it will be updated.
     */
    async saveAdjustment(adjustment: TransactionAdjustment): Promise<TransactionAdjustment> {
        return this.transactionAdjustmentRepo.save(adjustment);
    }
}