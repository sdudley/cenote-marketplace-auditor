import { Transaction } from '#common/entities/Transaction';
import { ProratedDetails } from '#common/types/marketplace';

/**
 * Returns true when proratedDetails is a non-empty array (MQB / prorated transaction).
 * Use this for opts.proratedDetails or transaction.data.purchaseDetails.proratedDetails.
 */
export function hasProratedDetails(details: ProratedDetails[]|undefined|null): boolean {
    return Array.isArray(details) && details.length > 0;
}

/**
 * Returns true if the transaction is a prorated (MQB) transaction.
 * MQB transactions have purchaseDetails.proratedDetails as a non-empty array.
 * These transactions represent "added users" during a monthly billing cycle and
 * should be excluded from maintenance continuity and previous-transaction logic.
 */
export function isMQBTransaction(transaction: Transaction): boolean {
    return hasProratedDetails(transaction.data?.purchaseDetails?.proratedDetails);
}

/**
 * Finds the parent (non-MQB) transaction for a prorated (MQB) transaction.
 * The parent is typically the non-prorated transaction for the same entitlement whose
 * maintenance end date equals this MQB transaction's maintenance end date.
 *
 * @param proratedTransaction The MQB transaction (must have proratedDetails)
 * @param candidates List of related transactions (e.g. same entitlement)
 * @returns The non-prorated transaction that spans the same billing period, or undefined
 */
export function findParentForMQBTransaction(
    proratedTransaction: Transaction,
    candidates: Transaction[]
): Transaction | undefined {
    if (!isMQBTransaction(proratedTransaction)) {
        return undefined;
    }

    const maintenanceEndDate = proratedTransaction.data.purchaseDetails.maintenanceEndDate;

    return candidates.find(
        (t) =>
            t.id !== proratedTransaction.id &&
            !isMQBTransaction(t) &&
            t.data.purchaseDetails.maintenanceEndDate === maintenanceEndDate
    );
}
