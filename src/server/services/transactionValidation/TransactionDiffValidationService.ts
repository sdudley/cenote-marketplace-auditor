import { Transaction } from "#common/entities/Transaction";
import { TransactionVersion } from "#common/entities/TransactionVersion";
import { TransactionValidationResult } from "./types";
import { injectable } from "inversify";

@injectable()
export class TransactionDiffValidationService {
    constructor() {}

    /**
     * Test to see if any important fields have been updated, and if so, add notes indicating
     * why the transaction should be unreconciled. If no notes are returned, we are not requesting
     * an unreconciliation.
     */
    public async createNotesForImportantTransactionMutations(opts: { transaction: Transaction; priorVersion: TransactionVersion; validationResult: TransactionValidationResult; }) : Promise<string[]> {
        const { transaction, priorVersion } = opts;

        const currentData = transaction.data;
        const priorData = priorVersion.data;

        const notes : string[] = [];

        if (currentData.purchaseDetails.purchasePrice !== priorData.purchaseDetails.purchasePrice) {
            notes.push('Unreconciling because purchase price has changed from ${formatCurrency(priorData.purchaseDetails.purchasePrice)} to ${formatCurrency(currentData.purchaseDetails.purchasePrice)}');
        }

        if (currentData.purchaseDetails.maintenanceStartDate !== priorData.purchaseDetails.maintenanceStartDate) {
            notes.push(`Unreconciling because maintenance start date has changed from ${priorData.purchaseDetails.maintenanceStartDate} to ${currentData.purchaseDetails.maintenanceStartDate}`);
        }

        if (currentData.purchaseDetails.maintenanceEndDate !== priorData.purchaseDetails.maintenanceEndDate) {
            notes.push(`Unreconciling because maintenance end date has changed from ${priorData.purchaseDetails.maintenanceEndDate} to ${currentData.purchaseDetails.maintenanceEndDate}`);
        }

        if (currentData.purchaseDetails.hosting !== priorData.purchaseDetails.hosting) {
            notes.push(`Unreconciling because hosting has changed from ${priorData.purchaseDetails.hosting} to ${currentData.purchaseDetails.hosting}`);
        }

        if (currentData.purchaseDetails.licenseType !== priorData.purchaseDetails.licenseType) {
            notes.push(`Unreconciling because license type has changed from ${priorData.purchaseDetails.licenseType} to ${currentData.purchaseDetails.licenseType}`);
        }

        if (currentData.purchaseDetails.tier !== priorData.purchaseDetails.tier) {
            notes.push(`Unreconciling because tier has changed from ${priorData.purchaseDetails.tier} to ${currentData.purchaseDetails.tier}`);
        }

        if (currentData.purchaseDetails.billingPeriod !== priorData.purchaseDetails.billingPeriod) {
            notes.push(`Unreconciling because billing period has changed from ${priorData.purchaseDetails.billingPeriod} to ${currentData.purchaseDetails.billingPeriod}`);
        }

        return notes;
    }
}