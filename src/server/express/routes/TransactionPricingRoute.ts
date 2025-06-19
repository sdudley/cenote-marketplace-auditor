import { inject, injectable } from "inversify";
import { Router, Request, Response } from 'express';
import { TransactionDao } from "#server/database/dao/TransactionDao";
import { TYPES } from "#server/config/types";
import { TransactionValidationService } from "#server/services/transactionValidation/TransactionValidationService";
import { PricingService } from "#server/services/PricingService";
import { TransactionPricingResponse } from "#common/types/transactionPricing";

@injectable()
export class TransactionPricingRoute {
    public readonly router: Router;

    constructor(
        @inject(TYPES.TransactionDao) private transactionDao: TransactionDao,
        @inject(TYPES.TransactionValidationService) private transactionValidationService: TransactionValidationService,
        @inject(TYPES.PricingService) private pricingService: PricingService
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get('/:transactionId/pricing', this.getPricing.bind(this));
    }

    private async getPricing(req: Request, res: Response): Promise<void> {
        const { transactionId } = req.params;

        const transaction = await this.transactionDao.getTransactionById(transactionId);

        if (!transaction) {
            res.status(404).json({ error: 'Transaction not found' });
            return;
        }

        const pricing = await this.pricingService.getPricingForTransaction(transaction);

        if (!pricing) {
            res.status(400).json({ error: 'Pricing not found' });
            return;
        }

        const validationResult = await this.transactionValidationService.validateTransaction({ transaction, pricing });

        if (!validationResult) {
            res.status(400).json({ error: 'Invalid transaction' });
            return;
        }

        res.json({
            descriptors: validationResult.price.descriptors,
            expectedAmount: validationResult.expectedVendorAmount
         } as TransactionPricingResponse);
    }
}