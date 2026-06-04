import { inject, injectable } from 'inversify';
import { Router, Request, Response } from 'express';
import { TYPES } from '#server/config/types.js';
import { ApportionmentService } from '#server/services/ApportionmentService.js';
import { CalculateApportionmentRequest, MonthlyAggregateApportionmentResponse } from '#common/types/apportionment.js';
import { isValidPurchaseMonth } from '#common/util/purchaseMonthUtils.js';

@injectable()
export class ApportionmentRoute {
    public readonly router: Router;

    constructor(
        @inject(TYPES.ApportionmentService) private apportionmentService: ApportionmentService
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post('/calculate', this.calculate.bind(this));
    }

    private async calculate(req: Request, res: Response): Promise<void> {
        const { purchaseMonth } = req.body as CalculateApportionmentRequest;

        if (!purchaseMonth || !isValidPurchaseMonth(purchaseMonth)) {
            res.status(400).json({ error: 'purchaseMonth must be in yyyy-mm format' });
            return;
        }

        try {
            const result = await this.apportionmentService.calculateAggregateApportionment(purchaseMonth);
            res.json(result as MonthlyAggregateApportionmentResponse);
        } catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to calculate apportionment' });
        }
    }
}
