import { PricingTierResult } from '#common/types/pricingTierResult';
import { BillingPeriod, HostingType, SaleType, EnhancedLicenseType } from '#common/types/marketplace';
import { Transaction } from '#common/entities/Transaction';
import { TransactionDiscount, ProratedDetails } from '#common/types/marketplace';

/** Prorated (MQB) segment: users added on a given date, charged until maintenance end */
export type ProratedDetail = ProratedDetails;

export interface PriceCalcOpts {
    pricingTierResult: PricingTierResult;
    saleDate: string;
    saleType: SaleType;
    isSandbox: boolean;
    hosting: HostingType;
    parentProduct: string;
    licenseType: EnhancedLicenseType;
    tier: string;
    maintenanceStartDate: string;
    maintenanceEndDate: string;
    billingPeriod: BillingPeriod;
    previousPurchaseMaintenanceEndDate?: string | undefined;
    previousPricing?: PriceResult | undefined;
    expectedDiscount?: number; // always positive, even for refunds
    declaredPartnerDiscount: number;
    discounts?: TransactionDiscount[];
    /** When set, this is an MQB (Maximum Quantity Billing) prorated transaction - cloud monthly only */
    proratedDetails?: ProratedDetail[];
    /** When set, MQB uses this as the license size (from the overlapping full-period transaction) to compute marginal per-user tier. Caller must pass this; tier/oldTier on the MQB line are unreliable. */
    mqbLicenseUserCount?: number;
}

export interface PriceResult {
    vendorPrice: number;
    purchasePrice: number;
    dailyNominalPrice: number;
    descriptors: PriceCalcDescriptor[];
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

export interface PriceCalcDescriptor {
    description: string;
    subtotal?: number;
}