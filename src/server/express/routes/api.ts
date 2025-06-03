import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { EXPRESS_TYPES } from '../config/expressTypes';
import { TransactionRoute } from './TransactionRoute';

@injectable()
export class ApiRouter {
    public readonly router: Router;

    constructor(
        @inject(EXPRESS_TYPES.TransactionRoute) private transactionRoute: TransactionRoute
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        // Health check endpoint
        this.router.get('/health', (req: Request, res: Response) => {
            res.json({ status: 'ok' });
        });

        // Transaction routes
        this.router.use('/transactions', this.transactionRoute.router);
    }
}