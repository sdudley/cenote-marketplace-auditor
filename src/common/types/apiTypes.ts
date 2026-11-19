import { Transaction } from "#common/entities/Transaction.js";
import { License } from "#common/entities/License.js";
import { Quote } from "#common/entities/Quote.js";

export interface TransactionResult {
    transaction: Transaction;
    isSandbox: boolean;
    versionCount: number;
    cloudSiteHostname: string;
    relatedEntitlementNumbers?: string[];
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

export enum QuoteQuerySortType {
    CreatedAt = 'createdAt',
    UpdatedAt = 'updatedAt',
    CreatedDate = 'quoteCreatedDate',
    ExpiryDate = 'quoteExpiryDate',
    StartDate = 'startDate',
    EndDate = 'endDate',
    VersionCount = 'versionCount',
    LineCount = 'lineCount',
    ScheduleCount = 'scheduleCount',
}

export interface QuoteQueryParams {
    start?: number;
    limit?: number;
    sortBy?: QuoteQuerySortType;
    sortOrder?: 'ASC' | 'DESC';
    search?: string;
}

export interface QuoteResult {
    quote: Quote;
    versionCount: number;
}

export interface QuoteQueryResult {
    quotes: QuoteResult[];
    total: number;
    count: number;
}

export interface AppInfo {
    addonKey: string;
    name: string;
    parentProduct: string;
    forgeMigrationDate?: string | null;
    forgeReleaseDate?: string | null;
    alwaysForge: boolean;
    forgePromoStartDate?: string | null;
    forgePromoEndDate?: string | null;
}

export interface AppUpdateRequest {
    forgeMigrationDate?: string | null;
    forgeReleaseDate?: string | null;
    alwaysForge?: boolean;
    forgePromoStartDate?: string | null;
    forgePromoEndDate?: string | null;
}

export interface AppPricingInfoDto {
    id: string;
    userTier: number;
    cost: number;
}

export interface AppPricingPeriodSummary {
    id: string;
    startDate: string | null;
    endDate: string | null;
    expertDiscountOptOut: boolean;
}

export interface AppPricingPeriodDetail extends AppPricingPeriodSummary {
    addonKey: string;
    deploymentType: string;
    items: AppPricingInfoDto[];
}

export interface AppPricingSaveRequest {
    deploymentType: string;
    startDate?: string | null;
    endDate?: string | null;
    expertDiscountOptOut?: boolean;
    items: Array<{
        userTier: number;
        cost: number;
    }>;
}
