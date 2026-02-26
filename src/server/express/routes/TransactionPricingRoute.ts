import { inject, injectable } from "inversify";
import { Router, Request, Response } from 'express';
import { TransactionDao } from "#server/database/dao/TransactionDao";
import { TYPES } from "#server/config/types";
import { TransactionValidationService } from "#server/services/transactionValidation/TransactionValidationService";
import { PricingService } from "#server/services/PricingService";
import { TransactionPricingResponse, PriceTestSnippetResponse } from "#common/types/transactionPricing";
import { TransactionData } from "#common/types/marketplace";

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
        this.router.post('/:transactionId/price-test-snippet', this.getPriceTestSnippet.bind(this));
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

    /**
     * Build test snippet data for a given transaction version: run validation with the provided
     * transaction data (e.g. from a version), return pricingTierResult, pricingOpts, and actual
     * purchasePrice/vendorAmount for generating a PriceCalculatorService test.
     */
    private async getPriceTestSnippet(req: Request, res: Response): Promise<void> {
        const { transactionId } = req.params;
        const { transactionData } = req.body as { transactionData?: TransactionData };

        if (!transactionData?.purchaseDetails) {
            res.status(400).json({ error: 'Request body must include transactionData with purchaseDetails' });
            return;
        }

        const transaction = await this.transactionDao.getTransactionById(transactionId);
        if (!transaction) {
            res.status(404).json({ error: 'Transaction not found' });
            return;
        }

        const originalData = transaction.data;
        transaction.data = transactionData;

        let pricing;
        try {
            pricing = await this.pricingService.getPricingForTransaction(transaction);
        } catch {
            transaction.data = originalData;
            res.status(400).json({ error: 'Pricing not found for this transaction' });
            return;
        }

        if (!pricing) {
            transaction.data = originalData;
            res.status(400).json({ error: 'Pricing not found for this transaction' });
            return;
        }

        try {
            const validationResult = await this.transactionValidationService.validateTransaction({ transaction, pricing });
            if (!validationResult) {
                res.status(400).json({ error: 'Validation could not produce a result for this transaction data' });
                return;
            }

            const response: PriceTestSnippetResponse = {
                pricingTierResult: validationResult.pricingOpts.pricingTierResult,
                pricingOpts: validationResult.pricingOpts,
                purchasePrice: validationResult.price.purchasePrice,
                vendorAmount: validationResult.price.vendorPrice,
                dailyNominalPrice: validationResult.price.dailyNominalPrice
            };
            res.json(response);
        } finally {
            transaction.data = originalData;
        }
    }
}