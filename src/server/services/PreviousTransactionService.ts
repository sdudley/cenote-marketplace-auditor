import { inject, injectable } from 'inversify';
import { TYPES } from '../config/types';
import { Transaction } from '#common/entities/Transaction';
import { TransactionDao } from '../database/dao/TransactionDao';
import { PreviousTransactionResult } from '#server/services/types';
import { findParentForMQBTransaction, isMQBTransaction } from '#common/util/mqbUtils';

@injectable()
export class PreviousTransactionService {
    constructor(
        @inject(TYPES.TransactionDao) private transactionDao: TransactionDao
    ) {}

    /**
     * Finds the previous transaction for a given transaction, taking into account
     * refunds and upgrades that may have affected the maintenance period.
     *
     * @param transaction The transaction to find the previous transaction for
     * @returns The previous transaction and its effective maintenance end date, or undefined if no previous transaction exists
     */
    public async findPreviousTransaction(transaction: Transaction): Promise<PreviousTransactionResult | undefined> {
        const relatedTransactions = await this.transactionDao.loadRelatedTransactions(transaction.entitlementId);

        // Filter out the current transaction and MQB (prorated) transactions; MQB does not affect maintenance continuity
        const otherTransactions = relatedTransactions.filter(
            (t) => t.id !== transaction.id && !isMQBTransaction(t)
        );

        // Track the effective end date of each transaction
        const effectiveEndDates = new Map<string, string>();

        // First pass: process all refunds to adjust effective end dates, but only
        // look at refunds that were created prior to this transaction (or on the same day)

        for (const otherTx of otherTransactions) {
            if (otherTx.data.purchaseDetails.saleType === 'Refund' &&
                otherTx.data.purchaseDetails.saleDate <= transaction.data.purchaseDetails.saleDate) {
                const refundStart = otherTx.data.purchaseDetails.maintenanceStartDate;
                const refundEnd = otherTx.data.purchaseDetails.maintenanceEndDate;

                // Find the transaction that this refund is actually refunding
                // It should be the one with the most similar maintenance period
                const refundedTxs = otherTransactions.filter(t =>
                    t.data.purchaseDetails.saleType !== 'Refund' &&
                    t.data.purchaseDetails.maintenanceStartDate <= refundEnd &&
                    t.data.purchaseDetails.maintenanceEndDate >= refundStart &&
                    t.data.purchaseDetails.saleDate <= otherTx.data.purchaseDetails.saleDate &&
                    t.data.purchaseDetails.tier === otherTx.data.purchaseDetails.tier
                );

                // Find the transaction with the most overlap with the refund period
                let bestMatch: Transaction | undefined;
                let maxOverlap = 0;

                for (const refundedTx of refundedTxs) {
                    const overlapStart = Math.max(new Date(refundStart).getTime(), new Date(refundedTx.data.purchaseDetails.maintenanceStartDate).getTime());
                    const overlapEnd = Math.min(new Date(refundEnd).getTime(), new Date(refundedTx.data.purchaseDetails.maintenanceEndDate).getTime());
                    const overlap = overlapEnd - overlapStart;

                    if (overlap > maxOverlap) {
                        maxOverlap = overlap;
                        bestMatch = refundedTx;
                    }
                }

                if (bestMatch) {
                    const refundedTx = bestMatch;
                    const currentEnd = effectiveEndDates.get(refundedTx.id) || refundedTx.data.purchaseDetails.maintenanceEndDate;

                    // If the refund covers the entire maintenance period, mark it as fully refunded
                    if (refundStart <= refundedTx.data.purchaseDetails.maintenanceStartDate &&
                        refundEnd >= currentEnd) {
                        effectiveEndDates.set(refundedTx.id, refundedTx.data.purchaseDetails.maintenanceStartDate);
                    } else {
                        // For partial refunds, adjust the effective end date
                        if (currentEnd > refundStart) {
                            const newEndDate = refundEnd < currentEnd ? refundEnd : refundStart;
                            effectiveEndDates.set(refundedTx.id, newEndDate);
                        }
                    }
                }
            }
        }

        // Find the transaction with the latest maintenance end date that ended before the current transaction's start
        let latestTransaction: Transaction | undefined;
        let latestEndDate: string | undefined;

        for (const otherTx of otherTransactions) {
            if (otherTx.data.purchaseDetails.saleDate > transaction.data.purchaseDetails.saleDate) continue;
            if (otherTx.data.purchaseDetails.saleType === 'Refund') continue;

            const effectiveEnd = effectiveEndDates.get(otherTx.id) || otherTx.data.purchaseDetails.maintenanceEndDate;

            // Skip fully refunded transactions (where effective end date equals start date)
            if (effectiveEnd === otherTx.data.purchaseDetails.maintenanceStartDate) {
                continue;
            }

            // A transaction is "older" if its maintenance period ended before the current transaction's start
            if (effectiveEnd <= transaction.data.purchaseDetails.maintenanceStartDate ||
                effectiveEnd <= transaction.data.purchaseDetails.maintenanceEndDate) {
                // If this transaction ends later than our current latest
                if (!latestEndDate || effectiveEnd > latestEndDate) {
                    latestTransaction = otherTx;
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

    /**
     * For a Refund transaction, finds the transaction that this refund is refunding (overlapping
     * maintenance period, same tier, sold before the refund). Used so we can apply the same
     * overlap-based pricing when the refunded purchase was an upgrade.
     *
     * @param refundTransaction A transaction with saleType === 'Refund'
     * @returns The transaction being refunded, or undefined if none found
     */
    public async findRefundedTransaction(refundTransaction: Transaction): Promise<Transaction | undefined> {
        if (refundTransaction.data.purchaseDetails.saleType !== 'Refund') {
            return undefined;
        }

        const thisTransactionIsMQB = isMQBTransaction(refundTransaction);

        const relatedTransactions = await this.transactionDao.loadRelatedTransactions(refundTransaction.entitlementId);
        const otherTransactions = relatedTransactions.filter(
            (t) => t.id !== refundTransaction.id && isMQBTransaction(t)===thisTransactionIsMQB
        );

        const refundStart = refundTransaction.data.purchaseDetails.maintenanceStartDate;
        const refundEnd = refundTransaction.data.purchaseDetails.maintenanceEndDate;
        const refundSaleDate = refundTransaction.data.purchaseDetails.saleDate;
        const refundTier = refundTransaction.data.purchaseDetails.tier;

        const refundedTxs = otherTransactions.filter(t =>
            t.data.purchaseDetails.saleType !== 'Refund' &&
            t.data.purchaseDetails.maintenanceStartDate <= refundEnd &&
            t.data.purchaseDetails.maintenanceEndDate >= refundStart &&
            t.data.purchaseDetails.saleDate <= refundSaleDate &&
            t.data.purchaseDetails.tier === refundTier
        );

        let bestMatch: Transaction | undefined;
        let maxOverlap = 0;

        for (const refundedTx of refundedTxs) {
            const overlapStart = Math.max(new Date(refundStart).getTime(), new Date(refundedTx.data.purchaseDetails.maintenanceStartDate).getTime());
            const overlapEnd = Math.min(new Date(refundEnd).getTime(), new Date(refundedTx.data.purchaseDetails.maintenanceEndDate).getTime());
            const overlap = overlapEnd - overlapStart;

            if (overlap > maxOverlap) {
                maxOverlap = overlap;
                bestMatch = refundedTx;
            }
        }

        return bestMatch;
    }

    /**
     * For a prorated (MQB) transaction, finds the base (primary) transaction that is being upgraded—
     * the full-period transaction for the same entitlement and maintenance end date, non-prorated.
     * Used to get the real license size for MQB marginal pricing; tier/oldTier on the MQB line are unreliable.
     */
    public async findParentTransactionForProratedTransaction(transaction: Transaction): Promise<Transaction | undefined> {
        const related = await this.transactionDao.loadRelatedTransactions(transaction.entitlementId);
        return findParentForMQBTransaction(transaction, related);
    }
}