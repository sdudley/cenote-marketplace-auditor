import { inject, injectable } from "inversify";
import { Transaction } from "#common/entities/Transaction";
import { TYPES } from "../config/types";
import { Repository } from "typeorm";
import { DataSource } from "typeorm";
import { TransactionData } from "#common/types/marketplace";
import { TransactionQueryParams, TransactionQueryResult, TransactionQuerySortType } from "#common/types/apiTypes";
import { RawSqlResultsToEntityTransformer } from "typeorm/query-builder/transformer/RawSqlResultsToEntityTransformer";
import { In } from "typeorm";
import { SelectQueryBuilder } from "typeorm";

@injectable()
class TransactionDao {
    private transactionRepo: Repository<Transaction>;

    private readonly sortFieldMap: Record<TransactionQuerySortType, string[]> = {
        [TransactionQuerySortType.CreatedAt]: [ 'transaction.createdAt' ],
        [TransactionQuerySortType.UpdatedAt]: [ 'transaction.updatedAt' ],
        [TransactionQuerySortType.SaleDate]: [ "transaction.data ->'purchaseDetails'->>'saleDate'", 'transaction.createdAt' ],
        [TransactionQuerySortType.VersionCount]: [ 'version_count.version_count', 'transaction.createdAt' ],
        [TransactionQuerySortType.VendorAmount]: [ '(transaction.data ->\'purchaseDetails\'->>\'vendorAmount\')::numeric(14,3)', 'transaction.createdAt' ]
    };

    constructor(@inject(TYPES.DataSource) private dataSource: DataSource) {
        this.transactionRepo = this.dataSource.getRepository(Transaction);
    }

    public async getTransactionForKey(transactionKey: string) : Promise<Transaction|null> {
        return await this.transactionRepo.findOne({ where: { marketplaceTransactionId: transactionKey } });
    }

    public async getTransactionById(id: string): Promise<Transaction | null> {
        return await this.transactionRepo.findOne({ where: { id } });
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

    private async getRawResultsAndTransformToEntities(queryBuilder: SelectQueryBuilder<Transaction>): Promise<{ rawResults: any[], transactions: Transaction[] }> {
        // getRawAndEntities crashes with unknown "databaseName" we try to sort by a jsonpath expression
        // Instead, we use getRawMany and convert them to entities ourself. This also requires
        // switching to offset/limit instead of skip/take.

        // const rawResults = await queryBuilder.getRawAndEntities();
        const rawResults = await queryBuilder.getRawMany();

        const transformer = new RawSqlResultsToEntityTransformer(queryBuilder.expressionMap, this.dataSource.driver, [], []);
        const transactions = transformer.transform(rawResults, queryBuilder.expressionMap.mainAlias!);

        return { rawResults, transactions };
    }

    private async loadNotesForTransactions(transactions: Transaction[]): Promise<void> {
        const transactionIds = transactions.map(t => t.id);
        const notes = await this.dataSource
            .getRepository('transaction_reconcile_note')
            .find({
                where: {
                    transactionReconcile: {
                        transaction: {
                            id: In(transactionIds)
                        }
                    }
                },
                relations: ['transactionReconcile'],
                order: {
                    createdAt: 'ASC'
                }
            });

        // Group notes by transaction reconcile ID
        const notesByReconcileId = notes.reduce((acc, note) => {
            const reconcileId = note.transactionReconcile.id;
            if (!acc[reconcileId]) {
                acc[reconcileId] = [];
            }
            acc[reconcileId].push(note);
            return acc;
        }, {} as Record<string, typeof notes>);

        // Attach notes to their respective reconcile records
        transactions.forEach(transaction => {
            if (transaction.reconcile) {
                transaction.reconcile.notes = notesByReconcileId[transaction.reconcile.id] || [];
            }
        });
    }

    async getTransactions(params: TransactionQueryParams): Promise<TransactionQueryResult> {
        const {
            start = 0,
            limit = 25,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
            search,
            reconciled
        } = params;

        try {
            const queryBuilder = this.transactionRepo.createQueryBuilder('transaction');

            // Add CTE for version counts
            queryBuilder.addCommonTableExpression(`
                SELECT transaction_version.transaction_id as tid, count(id) as version_count
                FROM transaction_version
                GROUP BY transaction_version.transaction_id`,
                'version_count'
            );

            // Select all transaction fields and the version count
            queryBuilder.addSelect('COALESCE(version_count.version_count, 0)', 'transaction_versionCount');

            // Join with the version count CTE
            queryBuilder.leftJoin('version_count', 'version_count', 'version_count.tid = transaction.id');

            // Add join for reconcile
            queryBuilder.leftJoinAndSelect('transaction.reconcile', 'reconcile');

            // Add join with license table
            queryBuilder.leftJoin('license', 'license', 'license.entitlement_id = transaction.entitlement_id');
            queryBuilder.addSelect('license.data->>\'installedOnSandbox\'', 'license_installedOnSandbox');
            queryBuilder.addSelect('license.data->>\'cloudSiteHostname\'', 'license_cloudSiteHostname');

            if (search) {
                // Inspiration: https://stackoverflow.com/a/45849743/2220556
                queryBuilder.where(
                    'jsonb_path_exists(transaction.data, format(\'$.** ? (@.type() == "string" && @ like_regex %s flag "qi")\', :search::text)::jsonpath)',
                    { search: `"${this.escapeDoubleQuotes(search)}"` }
                );
            }

            if (typeof reconciled === 'boolean') {
                if (reconciled) {
                    queryBuilder.andWhere('reconcile.reconciled = :reconciled', { reconciled });
                } else {
                    queryBuilder.andWhere('reconcile.reconciled = :reconciled or reconcile.reconciled is null', { reconciled });
                }
            }

            // Apply sorting using the sort field map
            const orderByField = this.sortFieldMap[sortBy as TransactionQuerySortType];
            if (!orderByField) {
                throw new Error(`Invalid sortBy: ${sortBy}`);
            }

            orderByField.forEach(field => queryBuilder.addOrderBy(field, sortOrder));

            const total = await queryBuilder.getCount();

            //queryBuilder.skip(start).take(limit);
            queryBuilder.offset(start).limit(limit);

            const { rawResults, transactions } = await this.getRawResultsAndTransformToEntities(queryBuilder);

            await this.loadNotesForTransactions(transactions);

            const transactionResults = transactions.map((transaction, index) => {
                const versionCount = parseInt(rawResults[index].transaction_versionCount) || 0;
                const isSandbox = rawResults[index].license_installedOnSandbox === 'Yes';
                const cloudSiteHostname = rawResults[index].license_cloudSiteHostname;

                return {
                    transaction,
                    versionCount,
                    isSandbox,
                    cloudSiteHostname
                };
            });

            return {
                transactions: transactionResults,
                total,
                count: transactionResults.length
            };
        } catch (error: any) {
            throw error;
        }
    }

    private escapeDoubleQuotes(str: string) {
        return str.replace(/"/g, '\\"');
    }
}

export { TransactionDao };