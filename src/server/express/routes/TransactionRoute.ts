import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types';
import { TransactionDao } from '../../database/dao/TransactionDao';
import { ConfigDao } from '../../database/dao/ConfigDao';
import { TransactionQueryParams, TransactionQuerySortType } from '#common/types/apiTypes';
import { TransactionQueryResult } from '#common/types/apiTypes';
import { pseudonymizeTransaction } from '#common/pseudonymize/pseudonymizeTransaction';
import { ConfigKey } from '#common/types/configItem';

@injectable()
export class TransactionRoute {
    public router: Router;

    constructor(
        @inject(TYPES.TransactionDao) private transactionDao: TransactionDao,
        @inject(TYPES.ConfigDao) private configDao: ConfigDao
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/', this.getTransactions.bind(this));
    }

    private async getTransactions(req: Request, res: Response) {
        try {
            const params: TransactionQueryParams = {
                start: parseInt(req.query.start as string) || 0,
                limit: parseInt(req.query.limit as string) || 25,
                sortBy: (req.query.sortBy as TransactionQuerySortType) || TransactionQuerySortType.CreatedAt,
                sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC',
                search: req.query.search as string,
                reconciled: req.query.reconciled === 'Y' ? true : req.query.reconciled==='N' ? false : undefined,
                saleType: req.query.saleType as string,
                hosting: req.query.hosting as string,
                addonKey: req.query.addonKey as string
            };

            // Validate parameters
            if (params.start! < 0) {
                return res.status(400).json({ error: 'start must be non-negative' });
            }
            if (params.limit! < 1 || params.limit! > 100) {
                return res.status(400).json({ error: 'limit must be between 1 and 100' });
            }

            // Validate sortBy using TransactionQuerySortType enum
            if (!Object.values(TransactionQuerySortType).includes(params.sortBy as TransactionQuerySortType)) {
                return res.status(400).json({
                    error: `sortBy must be one of: ${Object.values(TransactionQuerySortType).join(', ')}`
                });
            }

            if (params.sortOrder !== 'ASC' && params.sortOrder !== 'DESC') {
                return res.status(400).json({ error: 'sortOrder must be either ASC or DESC' });
            }

            const result : TransactionQueryResult = await this.transactionDao.getTransactions(params);

            const demoMode = await this.configDao.get<boolean>(ConfigKey.DemoMode);
            if (demoMode === true) {
                result.transactions = result.transactions.map(tr => ({...tr, transaction: pseudonymizeTransaction(tr.transaction)}));
            }

            res.json(result);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
