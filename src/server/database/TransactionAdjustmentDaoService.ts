import { DataSource, Repository } from 'typeorm';
import { Transaction } from '@common/entities/Transaction';
import { TransactionAdjustment } from '@common/entities/TransactionAdjustment';
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
     * Get the adjustments for a transaction
     */
    async getAdjustmentsForTransaction(transaction: Transaction): Promise<TransactionAdjustment[]> {
        return this.transactionAdjustmentRepo.find({
            where: {
                transaction: { id: transaction.id }
            },
            order: {
                createdAt: 'ASC'
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