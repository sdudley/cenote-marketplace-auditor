import { inject, injectable } from "inversify";
import { Transaction } from "#common/entities/Transaction";
import { TYPES } from "../config/types";
import { TransactionVersion } from "#common/entities/TransactionVersion";
import { Repository } from "typeorm";
import { DataSource } from "typeorm";
import { TransactionData } from "#common/types/marketplace";
import { IsNull } from "typeorm";

@injectable()
export default class TransactionDao {
    private transactionRepo: Repository<Transaction>;
    private transactionVersionRepo: Repository<TransactionVersion>;

    constructor(@inject(TYPES.DataSource) private dataSource: DataSource) {
        this.transactionRepo = this.dataSource.getRepository(Transaction);
        this.transactionVersionRepo = this.dataSource.getRepository(TransactionVersion);
    }

    public async getTransactionForKey(transactionKey: string) : Promise<Transaction|null> {
        return await this.transactionRepo.findOne({ where: { marketplaceTransactionId: transactionKey } });
    }

    public async getCurrentTransactionVersion(transaction: Transaction) : Promise<TransactionVersion|null> {
        return await this.transactionVersionRepo.findOne({
            where: { transaction, nextTransactionVersion: IsNull() },
            order: { createdAt: 'DESC' },
            relations: ['nextTransactionVersion', 'priorTransactionVersion']
        });
    }

    public async saveTransactionVersions(...versions: TransactionVersion[]) : Promise<void> {
        await this.transactionVersionRepo.save(versions);
    }

    public async saveTransaction(transaction: Transaction) : Promise<void> {
        await this.transactionRepo.save(transaction);
    }

    public getEntitlementIdForTransaction(t: TransactionData) {
        return t.appEntitlementNumber || t.licenseId;
    }

    public getKeyForTransaction(t: TransactionData) {
        return `${t.transactionLineItemId}:${t.transactionId}`;
    }

    // Fetch all transactions from the database that have a sale date greater than or equal to the start date.

    public async getTransactionsBySaleDate(startDate: string): Promise<Transaction[]> {
        return await this.transactionRepo
            .createQueryBuilder('transaction')
            .where('transaction.data->\'purchaseDetails\'->>\'saleDate\' >= :startDate', { startDate })
            .orderBy("transaction.data->'purchaseDetails'->>'saleDate'", 'ASC')
            .addOrderBy('transaction.created_at', 'ASC')
            .getMany();
    }

    // Loads all transactions that are related to the given entitlement ID, ordered by
    // descending sale date, such that the most recent transaction should be first.

    public async loadRelatedTransactions(entitlementId: string) : Promise<Transaction[]> {
        // Get transactions sorted by date descending from the database
        const transactions = await this.transactionRepo
            .createQueryBuilder('transaction')
            .where('transaction.entitlementId = :entitlementId', { entitlementId })
            .orderBy('transaction.data->\'purchaseDetails\'->>\'saleDate\'', 'DESC')
            .orderBy('transaction.data->\'purchaseDetails\'->>\'maintenanceStartDate\'', 'DESC')
            .addOrderBy('transaction.created_at', 'DESC')
            .getMany();

        const sortedTransactions = transactions.sort((a, b) => {
            const aDate = a.data.purchaseDetails.saleDate;
            const bDate = b.data.purchaseDetails.saleDate;

            // If same date, put refunds before purchases
            if (aDate === bDate) {
                if (a.data.purchaseDetails.saleType !== 'Refund' && b.data.purchaseDetails.saleType === 'Refund') return -1;
                if (a.data.purchaseDetails.saleType === 'Refund' && b.data.purchaseDetails.saleType !== 'Refund') return 1;
            }

            if (aDate < bDate) return 1;
            if (aDate > bDate) return -1;
            return 0;
        });

        return sortedTransactions;
    }
}