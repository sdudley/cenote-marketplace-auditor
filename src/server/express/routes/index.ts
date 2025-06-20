import { Router, Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { EXPRESS_TYPES } from '../config/expressTypes';
import { TransactionRoute } from './TransactionRoute';
import { TransactionVersionRoute } from './TransactionVersionRoute';
import { TransactionReconcileRoute } from './TransactionReconcileRoute';
import { ConfigRoute } from './ConfigRoute';
import { JobRoute } from './JobRoute';
import { LicenseRoute } from './LicenseRoute';
import { LicenseVersionRoute } from './LicenseVersionRoute';
import { SchedulerRoute } from './SchedulerRoute';
import { TransactionPricingRoute } from './TransactionPricingRoute';
import { AppRoute } from './AppRoutes';

@injectable()
export class ApiRouter {
    public readonly router: Router;

    constructor(
        @inject(EXPRESS_TYPES.TransactionRoute) private transactionRoute: TransactionRoute,
        @inject(EXPRESS_TYPES.TransactionVersionRoute) private transactionVersionRoute: TransactionVersionRoute,
        @inject(EXPRESS_TYPES.TransactionReconcileRoute) private transactionReconcileRoute: TransactionReconcileRoute,
        @inject(EXPRESS_TYPES.ConfigRoute) private configRoute: ConfigRoute,
        @inject(EXPRESS_TYPES.JobRoute) private jobRoute: JobRoute,
        @inject(EXPRESS_TYPES.LicenseRoute) private licenseRoute: LicenseRoute,
        @inject(EXPRESS_TYPES.LicenseVersionRoute) private licenseVersionRoute: LicenseVersionRoute,
        @inject(EXPRESS_TYPES.SchedulerRoute) private schedulerRoute: SchedulerRoute,
        @inject(EXPRESS_TYPES.TransactionPricingRoute) private transactionPricingRoute: TransactionPricingRoute,
        @inject(EXPRESS_TYPES.AppRoute) private appRoute: AppRoute
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
        this.router.use('/transactions', this.transactionPricingRoute.router);

        // License routes
        this.router.use('/licenses', this.licenseRoute.router);
        this.router.use('/licenses', this.licenseVersionRoute.router);

        // Config routes
        this.router.use('/config', this.configRoute.getRouter());

        // Job routes
        this.router.use('/jobs', this.jobRoute.getRouter());

        // Scheduler routes
        this.router.use('/scheduler', this.schedulerRoute.getRouter());

        // App routes
        this.router.use('/apps', this.appRoute.router);

        // 404 handler for non-existent API endpoints
        this.router.use('*', (req: Request, res: Response) => {
            res.status(404).json({ error: 'API endpoint not found' });
        });
    }
}