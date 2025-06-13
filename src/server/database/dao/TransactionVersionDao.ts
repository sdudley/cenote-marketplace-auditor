import { TransactionVersion } from "#common/entities/TransactionVersion";
import { Transaction } from "#common/entities/Transaction";
import { TYPES } from "#server/config/types";
import { inject, injectable } from "inversify";
import { DataSource, Repository } from "typeorm";
import { isUUID } from "validator";

@injectable()
export class TransactionVersionDao {
    private transactionVersionRepo: Repository<TransactionVersion>;

    constructor(@inject(TYPES.DataSource) dataSource: DataSource) {
        this.transactionVersionRepo = dataSource.getRepository(TransactionVersion);
    }

    public async getTransactionVersions(transactionId: string): Promise<TransactionVersion[]> {
        if (!isUUID(transactionId)) {
            throw new Error('Invalid transaction ID: must be a valid UUID');
        }

        return await this.transactionVersionRepo.find({
            where: { transaction: { id: transactionId } },
            order: { version: 'DESC' }
        });
    }

    public async getTransactionVersionByNumber(opts: { transactionId: string, version: number }): Promise<TransactionVersion | null> {
        const { transactionId, version } = opts;

        if (!isUUID(opts.transactionId)) {
            throw new Error('Invalid transaction ID: must be a valid UUID');
        }

        return await this.transactionVersionRepo.findOne({
            where: { transaction: { id: transactionId }, version }
        });
    }

    public async getTransactionHighestVersion(transaction: Transaction) : Promise<number> {
        const queryBuilder = this.transactionVersionRepo.createQueryBuilder('transaction_version');
        queryBuilder.select('MAX(transaction_version.version)', 'maxVersion');
        queryBuilder.where('transaction_version.transaction_id = :transactionId', { transactionId: transaction.id });

        const result = await queryBuilder.getRawOne();
        const maxVersion = result?.maxVersion;
        return maxVersion ?? 0;
    }

    public async saveTransactionVersions(...versions: TransactionVersion[]) : Promise<void> {
        await this.transactionVersionRepo.save(versions);
    }
}