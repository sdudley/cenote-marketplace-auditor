import { inject, injectable } from 'inversify';
import { TYPES } from '../config/types';
import { Transaction } from '../entities/Transaction';
import TransactionDaoService from './TransactionDaoService';

export interface PreviousTransactionResult {
    transaction: Transaction;
    effectiveMaintenanceEndDate: string;
}

@injectable()
export class PreviousTransactionService {
    constructor(
        @inject(TYPES.TransactionDaoService) private transactionDaoService: TransactionDaoService
    ) {}

    /**
     * Finds the previous transaction for a given transaction, taking into account
     * refunds and upgrades that may have affected the maintenance period.
     *
     * @param transaction The transaction to find the previous transaction for
     * @returns The previous transaction and its effective maintenance end date, or undefined if no previous transaction exists
     */
    async findPreviousTransaction(transaction: Transaction): Promise<PreviousTransactionResult | undefined> {
        const relatedTransactions = await this.transactionDaoService.loadRelatedTransactions(transaction.entitlementId);

        // Filter out the current transaction
        const otherTransactions = relatedTransactions.filter(t => t.id !== transaction.id);

        // Track the effective end date of each transaction
        const effectiveEndDates = new Map<string, string>();

        // First pass: process all refunds to adjust effective end dates
        for (const tx of otherTransactions) {
            if (tx.data.purchaseDetails.saleType === 'Refund') {
                const refundStart = tx.data.purchaseDetails.maintenanceStartDate;
                const refundEnd = tx.data.purchaseDetails.maintenanceEndDate;

                // Find any transaction being possibly refunded, with an overlapping maintenance period,
                // and which was purchased before the refund (including on the same day, since we don't
                // have time-based ordering).

                const refundedTx = otherTransactions.find(t =>
                    t.data.purchaseDetails.saleType !== 'Refund' &&
                    t.data.purchaseDetails.maintenanceStartDate <= refundEnd &&
                    t.data.purchaseDetails.maintenanceEndDate >= refundStart &&
                    t.data.purchaseDetails.saleDate <= tx.data.purchaseDetails.saleDate
                );

                if (refundedTx) {
                    // If the refund covers the entire maintenance period, mark it as fully refunded
                    if (refundStart <= refundedTx.data.purchaseDetails.maintenanceStartDate &&
                        refundEnd >= refundedTx.data.purchaseDetails.maintenanceEndDate) {
                        // Subtract one day since refund includes the entire start day
                        effectiveEndDates.set(refundedTx.id, refundedTx.data.purchaseDetails.maintenanceStartDate);
                    } else {
                        // For partial refunds, adjust the effective end date
                        const currentEnd = effectiveEndDates.get(refundedTx.id) || refundedTx.data.purchaseDetails.maintenanceEndDate;
                        if (currentEnd > refundStart) {
                            const newEndDate = refundEnd < currentEnd ? refundEnd : refundStart;

                            // Subtract one day since refund includes the entire start day
                            effectiveEndDates.set(refundedTx.id, newEndDate);
                        }
                    }
                }
            }
        }

        // Find the transaction with the latest maintenance end date that ended before the current transaction's start
        let latestTransaction: Transaction | undefined;
        let latestEndDate: string | undefined;

        for (const tx of otherTransactions) {
            if (tx.data.purchaseDetails.saleType === 'Refund') continue;

            const effectiveEnd = effectiveEndDates.get(tx.id) || tx.data.purchaseDetails.maintenanceEndDate;

            // Skip fully refunded transactions (where effective end date equals start date)
            if (effectiveEnd === tx.data.purchaseDetails.maintenanceStartDate) continue;

            // A transaction is "older" if its maintenance period ended before the current transaction's start
            if (effectiveEnd < transaction.data.purchaseDetails.maintenanceStartDate) {
                // If this transaction ends later than our current latest
                if (!latestEndDate || effectiveEnd > latestEndDate) {
                    latestTransaction = tx;
                    latestEndDate = effectiveEnd;
                }
            }
        }

        if (latestTransaction && latestEndDate) {
            return {
                transaction: latestTransaction,
                effectiveMaintenanceEndDate: latestEndDate
            };
        }

        return undefined;
    }
}