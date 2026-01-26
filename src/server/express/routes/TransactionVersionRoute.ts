import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types';
import { TransactionVersionDao } from '../../database/dao/TransactionVersionDao';
import { ConfigDao } from '../../database/dao/ConfigDao';
import { pseudonymizeTransactionData } from '#common/pseudonymize/pseudonymizeTransaction';
import { ConfigKey } from '#common/types/configItem';

@injectable()
export class TransactionVersionRoute {
    public readonly router: Router;

    constructor(
        @inject(TYPES.TransactionVersionDao) private transactionVersionDao: TransactionVersionDao,
        @inject(TYPES.ConfigDao) private configDao: ConfigDao
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get('/:transactionId/versions', this.getTransactionVersions.bind(this));
    }

    private async getTransactionVersions(req: Request, res: Response): Promise<void> {
        try {
            const { transactionId } = req.params;

            if (!transactionId) {
                res.status(400).json({ error: 'Transaction ID is required' });
                return;
            }

            let versions = await this.transactionVersionDao.getTransactionVersions(transactionId);

            const demoMode = await this.configDao.get<boolean>(ConfigKey.DemoMode);
            if (demoMode === true) {
                versions = versions.map(tv => ({...tv, data: pseudonymizeTransactionData(tv.data)}));
            }

            res.json(versions);
        } catch (error) {
            console.error('Error fetching transaction versions:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}