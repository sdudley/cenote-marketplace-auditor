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

export type TransactionQuerySortType = 'createdAt' | 'saleDate' | 'updatedAt';

export interface TransactionQueryParams {
    start?: number;
    limit?: number;
    sortBy?: TransactionQuerySortType;
    sortOrder?: 'ASC' | 'DESC';
    search?: string;
}
