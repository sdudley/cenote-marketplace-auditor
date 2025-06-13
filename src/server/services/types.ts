import { PricingTierResult } from '#common/types/pricingTierResult';
import { BillingPeriod, HostingType, LicenseType, SaleType } from '#common/types/marketplace';
import { Transaction } from '#common/entities/Transaction';

export interface PriceCalcOpts {
    pricingTierResult: PricingTierResult;
    saleDate: string;
    saleType: SaleType;
    isSandbox: boolean;
    hosting: HostingType;
    licenseType: LicenseType;
    tier: string;
    maintenanceStartDate: string;
    maintenanceEndDate: string;
    billingPeriod: BillingPeriod;
    previousPurchaseMaintenanceEndDate?: string | undefined;
    previousPricing?: PriceResult | undefined;
    expectedDiscount?: number; // always positive, even for refunds
    partnerDiscountFraction: number;
}

export interface PriceResult {
    vendorPrice: number;
    purchasePrice: number;
    dailyNominalPrice: number;
}

export interface PreviousTransactionResult {
    transaction: Transaction;
    effectiveMaintenanceEndDate: string;
}

export type CloudOrServer = 'cloud' | 'datacenter' | 'server';
export type LiveOrPending = 'live' | 'pending';

export interface TransactionQueryParams {
    excludeZeroTransactions?: boolean;
    includeManualInvoice?: boolean;
}

export interface LicenseQueryParams {
    startDate?: string;
    endDate?: string;
    withDataInsights?: boolean;
    includeAtlassianLicenses?: boolean;
}