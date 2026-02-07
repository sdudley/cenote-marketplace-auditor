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
    VendorAmount = 'vendorAmount',
    MaintenanceDays = 'maintenanceDays',
    Discounts = 'discounts'
}

export enum LicenseQuerySortType {
    CreatedAt = 'createdAt',
    UpdatedAt = 'updatedAt',
    MaintenanceStartDate = 'maintenanceStartDate',
    MaintenanceEndDate = 'maintenanceEndDate',
    VersionCount = 'versionCount',
    AtlassianLastUpdated = 'atlassianLastUpdated',
    GracePeriod = 'gracePeriod',
    MaintenanceDays = 'maintenanceDays'
}

export interface TransactionQueryParams {
    start?: number;
    limit?: number;
    sortBy?: TransactionQuerySortType;
    sortOrder?: 'ASC' | 'DESC';
    reconciled: boolean|undefined;
    search?: string;
    saleType?: string;
    hosting?: string;
    addonKey?: string;
}

export interface LicenseQueryParams {
    start?: number;
    limit?: number;
    sortBy?: LicenseQuerySortType;
    sortOrder?: 'ASC' | 'DESC';
    search?: string;
    hosting?: string;
    status?: string;
    addonKey?: string;
    licenseType?: string[];
}

export interface LicenseResult {
    license: License;
    versionCount: number;
    dualLicensing: boolean;
}

export interface LicenseQueryResult {
    licenses: LicenseResult[];
    total: number;
    count: number;
}

export interface AppInfo {
    addonKey: string;
    name: string;
}
