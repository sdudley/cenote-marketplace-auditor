import { Router, Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { EXPRESS_TYPES } from '../config/expressTypes';
import { TransactionRoute } from './TransactionRoute';
import { TransactionVersionRoute } from './TransactionVersionRoute';
import { TransactionReconcileRoute } from './TransactionReconcileRoute';
import { ConfigRoute } from './ConfigRoute';
import { JobRoute } from './JobRoute';

@injectable()
export class ApiRouter {
    public readonly router: Router;

    constructor(
        @inject(EXPRESS_TYPES.TransactionRoute) private transactionRoute: TransactionRoute,
        @inject(EXPRESS_TYPES.TransactionVersionRoute) private transactionVersionRoute: TransactionVersionRoute,
        @inject(EXPRESS_TYPES.TransactionReconcileRoute) private transactionReconcileRoute: TransactionReconcileRoute,
        @inject(EXPRESS_TYPES.ConfigRoute) private configRoute: ConfigRoute,
        @inject(EXPRESS_TYPES.JobRoute) private jobRoute: JobRoute
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private setNoCacheHeaders(req: Request, res: Response, next: NextFunction): void {
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        next();
    }

    private initializeRoutes(): void {
        // Apply no-cache headers to all API routes
        this.router.use(this.setNoCacheHeaders.bind(this));

        // Health check endpoint
        this.router.get('/health', (req: Request, res: Response) => {
            res.json({ status: 'ok' });
        });

        // Transaction routes
        this.router.use('/transactions', this.transactionRoute.router);
        this.router.use('/transactions', this.transactionVersionRoute.router);
        this.router.use('/transactions', this.transactionReconcileRoute.router);

        // Config routes
        this.router.use('/config', this.configRoute.getRouter());

        // Job routes
        this.router.use('/jobs', this.jobRoute.getRouter());
    }
}