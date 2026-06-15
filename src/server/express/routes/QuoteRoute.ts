import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types.js';
import { MarketplaceService } from '../../services/MarketplaceService.js';
import { MarketplaceApiError } from '../../services/MarketplaceApiError.js';

@injectable()
export class QuoteRoute {
    public router: Router;

    constructor(
        @inject(TYPES.MarketplaceService) private marketplaceService: MarketplaceService
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/', this.getQuotes.bind(this));
    }

    private async getQuotes(_req: Request, res: Response) {
        try {
            const quotes = await this.marketplaceService.getQuotes();
            res.json({ quotes });
        } catch (error) {
            if (error instanceof MarketplaceApiError) {
                const status = mapMarketplaceErrorToHttpStatus(error.statusCode);
                console.error('Atlassian Marketplace API error:', error.message);
                res.status(status).json({
                    error: error.message,
                    upstreamStatus: error.statusCode
                });
                return;
            }
            console.error('Error fetching quotes from Atlassian:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

function mapMarketplaceErrorToHttpStatus(upstreamStatus: number): number {
    if (upstreamStatus === 404) {
        return 404;
    }
    if (upstreamStatus === 400) {
        return 400;
    }
    if (upstreamStatus >= 500) {
        return 502;
    }
    return 500;
}
