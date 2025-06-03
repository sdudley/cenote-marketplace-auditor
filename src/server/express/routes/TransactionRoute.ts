import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types';
import { TransactionDao } from '../../database/TransactionDao';
import { TransactionQueryParams, TransactionQuerySortType } from '#common/types/apiTypes';

@injectable()
export class TransactionRoute {
    public router: Router;

    constructor(
        @inject(TYPES.TransactionDao) private transactionDao: TransactionDao
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
                sortBy: (req.query.sortBy as TransactionQuerySortType) || 'createdAt',
                sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC',
                search: req.query.search as string
            };

            // Validate parameters
            if (params.start! < 0) {
                return res.status(400).json({ error: 'start must be non-negative' });
            }
            if (params.limit! < 1 || params.limit! > 100) {
                return res.status(400).json({ error: 'limit must be between 1 and 100' });
            }
            if (params.sortBy !== 'createdAt' && params.sortBy !== 'saleDate' && params.sortBy !== 'updatedAt') {
                return res.status(400).json({ error: 'sortBy must be one of: createdAt, updatedAt, saleDate' });
            }
            if (params.sortOrder !== 'ASC' && params.sortOrder !== 'DESC') {
                return res.status(400).json({ error: 'sortOrder must be either ASC or DESC' });
            }

            const result = await this.transactionDao.getTransactions(params);
            res.json(result);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
