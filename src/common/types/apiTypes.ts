import { Transaction } from "#common/entities/Transaction";
import { License } from "#common/entities/License";

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

export enum LicenseQuerySortType {
    CreatedAt = 'createdAt',
    UpdatedAt = 'updatedAt',
    MaintenanceStartDate = 'maintenanceStartDate',
    MaintenanceEndDate = 'maintenanceEndDate',
    VersionCount = 'versionCount'
}

export interface TransactionQueryParams {
    start?: number;
    limit?: number;
    sortBy?: TransactionQuerySortType;
    sortOrder?: 'ASC' | 'DESC';
    reconciled: boolean|undefined;
    search?: string;
}

export interface LicenseQueryParams {
    start?: number;
    limit?: number;
    sortBy?: LicenseQuerySortType;
    sortOrder?: 'ASC' | 'DESC';
    search?: string;
}

export interface LicenseResult {
    license: License;
    versionCount: number;
}

export interface LicenseQueryResult {
    licenses: LicenseResult[];
    total: number;
    count: number;
}
