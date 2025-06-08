import { TransactionVersion } from "#common/entities/TransactionVersion";
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
}