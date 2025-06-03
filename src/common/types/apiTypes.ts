import { Transaction } from "#common/entities/Transaction";

export interface TransactionResult {
    transaction: Transaction;
    versionCount: number;
}

export interface TransactionQueryResult {
    transactions: TransactionResult[];
    total: number;
    count: number;
}