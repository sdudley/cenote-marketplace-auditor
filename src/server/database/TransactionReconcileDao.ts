import { DataSource, Repository } from "typeorm";
import { TransactionReconcile } from "@common/entities/TransactionReconcile";
import { Transaction } from "@common/entities/Transaction";
import { inject, injectable } from "inversify";
import { TYPES } from "../config/types";

export interface RecordReconcileOpts {
    transaction: Transaction;
    existingReconcile: TransactionReconcile|null;
    valid: boolean;
    notes: string[];
    vendorAmount: number;
    expectedVendorAmount: number;
}

@injectable()
export default class TransactionReconcileDao {
    private transactionReconcileRepo: Repository<TransactionReconcile>;

    constructor(@inject(TYPES.DataSource) dataSource: DataSource) {
        this.transactionReconcileRepo = dataSource.getRepository(TransactionReconcile);
    }

    // Gets the current reconcile record for a transaction.

    public async getTransactionReconcileForTransaction(transaction: Transaction): Promise<TransactionReconcile | null> {
        return await this.transactionReconcileRepo.findOne({
            where: {
                transaction: { id: transaction.id },
                current: true
            }
        });
    }

    // Save a new reconcile record for a transaction, or update an existing reconcile record.

    public async recordReconcile(opts: RecordReconcileOpts): Promise<void> {
        const { transaction, existingReconcile, notes, vendorAmount, expectedVendorAmount } = opts;
        let { valid } = opts;

        // Update the existing reconcile record to be non-current

        if (existingReconcile) {
            existingReconcile.current = false;
            await this.transactionReconcileRepo.save(existingReconcile);
        }

        // Create new reconcile record

        if (valid && existingReconcile && !existingReconcile?.reconciled) {
            notes.push('Price matches but prior version of transaction was not reconciled, so expecting manual approval.');
            valid = false;
        }

        const reconcile = new TransactionReconcile();
        reconcile.transaction = transaction;
        reconcile.transactionVersion = transaction.currentVersion;
        reconcile.reconciled = existingReconcile ? valid && existingReconcile.reconciled : valid;
        reconcile.automatic = true;
        reconcile.notes = notes?.join('; ');
        reconcile.actualVendorAmount = vendorAmount;
        reconcile.expectedVendorAmount = expectedVendorAmount;
        reconcile.current = true;
        await this.transactionReconcileRepo.save(reconcile);
    }
}