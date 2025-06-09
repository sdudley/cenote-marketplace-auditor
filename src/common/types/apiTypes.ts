import { Transaction } from "#common/entities/Transaction";

export interface TransactionResult {
    transaction: Transaction;
    isSandbox: boolean;
    versionCount: number;
    cloudSiteHostname: string;
}

export interface TransactionQueryResult {
    transactions: TransactionResult[];
    total: number;
    count: number;
}

export enum TransactionQuerySortType {
    CreatedAt = 'createdAt',
    SaleDate = 'saleDate',
    UpdatedAt = 'updatedAt',
    VersionCount = 'versionCount',
    VendorAmount = 'vendorAmount'
}

export interface TransactionQueryParams {
    start?: number;
    limit?: number;
    sortBy?: TransactionQuerySortType;
    sortOrder?: 'ASC' | 'DESC';
    search?: string;
}
