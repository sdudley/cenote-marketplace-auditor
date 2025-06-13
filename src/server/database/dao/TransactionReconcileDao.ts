import { DataSource, Repository } from "typeorm";
import { TransactionReconcile } from "#common/entities/TransactionReconcile";
import { Transaction } from "#common/entities/Transaction";
import { inject, injectable } from "inversify";
import { TYPES } from "../../config/types";
import { TransactionReconcileNote } from "#common/entities/TransactionReconcileNote";

export interface RecordReconcileOpts {
    transaction: Transaction;
    existingReconcile: TransactionReconcile|null;
    reconciled: boolean;
    notes: string[];
    actualVendorAmount: number;
    expectedVendorAmount: number;
    automatic: boolean;
}

@injectable()
export class TransactionReconcileDao {
    private transactionReconcileRepo: Repository<TransactionReconcile>;
    private transactionReconcileNoteRepo: Repository<TransactionReconcileNote>;

    constructor(@inject(TYPES.DataSource) dataSource: DataSource) {
        this.transactionReconcileRepo = dataSource.getRepository(TransactionReconcile);
        this.transactionReconcileNoteRepo = dataSource.getRepository(TransactionReconcileNote);
    }

    // Gets the current reconcile record for a transaction.

    public async getTransactionReconcileForTransaction(transaction: Transaction): Promise<TransactionReconcile | null> {
        return await this.transactionReconcileRepo.findOne({
            where: {
                transaction: { id: transaction.id }
            }
        });
    }

    // Save a new reconcile record for a transaction, or update an existing reconcile record.

    public async recordReconcile(opts: RecordReconcileOpts): Promise<void> {
        const { transaction, notes, actualVendorAmount: vendorAmount, expectedVendorAmount, existingReconcile, automatic } = opts;
        let { reconciled } = opts;

        // Create new reconcile record

        const reconcile = existingReconcile ? existingReconcile : new TransactionReconcile();
        reconcile.transaction = transaction;
        reconcile.transactionVersion = transaction.currentVersion;
        reconcile.reconciled = reconciled;
        reconcile.automatic = automatic;
        reconcile.actualVendorAmount = vendorAmount;
        reconcile.expectedVendorAmount = expectedVendorAmount;
        await this.transactionReconcileRepo.save(reconcile);

        if (notes && notes.length > 0) {
            const noteEntities = notes.map((note) => {
                const entity = new TransactionReconcileNote();
                entity.note = note;
                entity.transactionReconcile = reconcile;
                entity.transactionVersion = transaction.currentVersion;
                return entity;
            });

            await this.transactionReconcileNoteRepo.save(noteEntities);
        }
    }
}