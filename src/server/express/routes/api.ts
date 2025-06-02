import { Router, Request, Response } from 'express';
import { injectable } from 'inversify';

@injectable()
export class ApiRouter {
    public readonly router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        // Health check endpoint
        this.router.get('/health', (req: Request, res: Response) => {
            res.json({ status: 'ok' });
        });

        // Add more routes here
    }
}