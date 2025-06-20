import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types';
import { TransactionDao } from '../../database/dao/TransactionDao';
import { TransactionReconcileDao } from '../../database/dao/TransactionReconcileDao';
import { isUUID } from 'validator';
import { CURRENT_RECONCILER_VERSION } from "#common/config/versions";

interface ReconcileRequestBody {
    reconciled: boolean;
    notes: string[];
}

@injectable()
export class TransactionReconcileRoute {
    public readonly router: Router;

    constructor(
        @inject(TYPES.TransactionDao) private transactionDao: TransactionDao,
        @inject(TYPES.TransactionReconcileDao) private transactionReconcileDao: TransactionReconcileDao
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.put('/:transactionId/reconcile', this.updateReconciliation.bind(this));
    }

    private async updateReconciliation(req: Request, res: Response): Promise<void> {
        try {
            const { transactionId } = req.params;
            const { reconciled, notes } = req.body as ReconcileRequestBody;

            // Validate transaction ID
            if (!isUUID(transactionId)) {
                res.status(400).json({ error: 'Invalid transaction ID: must be a valid UUID' });
                return;
            }

            // Validate request body
            if (typeof reconciled !== 'boolean') {
                res.status(400).json({ error: 'reconciled must be a boolean' });
                return;
            }

            if (!Array.isArray(notes) || notes.length === 0) {
                res.status(400).json({ error: 'notes must be a non-empty array of strings' });
                return;
            }

            // Get the transaction
            const transaction = await this.transactionDao.getTransactionById(transactionId);
            if (!transaction) {
                res.status(404).json({ error: 'Transaction not found' });
                return;
            }

            // Get existing reconcile record if any
            const existingReconcile = await this.transactionReconcileDao.getTransactionReconcileForTransaction(transaction);

            // Record the reconciliation
            await this.transactionReconcileDao.recordReconcile({
                transaction,
                existingReconcile,
                reconciled,
                notes,
                actualVendorAmount: transaction.data.purchaseDetails.vendorAmount,
                expectedVendorAmount: existingReconcile?.expectedVendorAmount ?? 0, // TODO FIXME populate this if there is no existing reconcile
                automatic: false,
                reconcilerVersion: CURRENT_RECONCILER_VERSION
            });

            res.json({ success: true });
        } catch (error) {
            console.error('Error updating transaction reconciliation:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}