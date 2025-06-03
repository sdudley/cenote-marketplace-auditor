import { inject, injectable } from "inversify";
import { Transaction } from "#common/entities/Transaction";
import { TYPES } from "../config/types";
import { TransactionVersion } from "#common/entities/TransactionVersion";
import { Repository } from "typeorm";
import { DataSource } from "typeorm";
import { TransactionData } from "#common/types/marketplace";
import { IsNull } from "typeorm";
import { TransactionQueryResult } from "#common/types/apiTypes";

export interface TransactionQueryParams {
    start?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'saleDate';
    sortOrder?: 'ASC' | 'DESC';
    search?: string;
}


@injectable()
class TransactionDao {
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

    /**
     * Search the entire set of transactions based on criteria.
     */
    async getTransactions(params: TransactionQueryParams): Promise<TransactionQueryResult> {
        const {
            start = 0,
            limit = 25,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
            search
        } = params;

        try {
            const queryBuilder = this.transactionRepo
                .createQueryBuilder('transaction');

            if (search) {
                queryBuilder.where(
                    'transaction.data::text ILIKE :search',
                    { search: `%${search}%` }
                );
            }

            const total = await queryBuilder.getCount();

            if (sortBy === 'saleDate') {
                queryBuilder.orderBy("transaction.data->'purchaseDetails'->>'saleDate'", sortOrder);
            } else {
                queryBuilder.orderBy('transaction.created_at', sortOrder);
            }

            queryBuilder.skip(start).take(limit);

            const transactions = await queryBuilder.getMany();

            const transactionIds = transactions.map(t => t.id);
            const versionCounts = (transactionIds.length > 0) ? await this.transactionVersionRepo
                .createQueryBuilder('version')
                .select('version.transaction_id', 'transaction_id')
                .addSelect('COUNT(version.id)', 'version_count')
                .where('version.transaction_id IN (:...ids)', { ids: transactionIds })
                .groupBy('version.transaction_id')
                .getRawMany() : [];

            const versionCountMap = new Map(
                versionCounts.map(vc => [vc.transaction_id, parseInt(vc.version_count)])
            );

            // Map results to TransactionResult objects
            const transactionResults = transactions.map(transaction => ({
                transaction,
                versionCount: versionCountMap.get(transaction.id) || 0
            }));

            return {
                transactions: transactionResults,
                total,
                count: transactionResults.length
            };
        } catch (error: any) {
            throw error;
        }
    }
}

export { TransactionDao };