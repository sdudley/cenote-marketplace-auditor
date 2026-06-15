import { components } from './marketplace-api.js';
import { components as v3Components } from './marketplace-v3-api.js';

// Simplified type names to represent individual components imported from the
// Atlassian Marketplace OpenAPI spec

export type InitiateAsyncLicenseCollection = components["schemas"]["InitiateAsyncLicenseCollection"];
export type InitiateAsyncLicense = components["schemas"]["InitiateAsyncLicense"];
export type InitiateAsyncTransactionCollection = components["schemas"]["InitiateAsyncTransactionCollection"];
export type StatusAsyncTransactionCollection = components["schemas"]["StatusAsyncTransactionCollection"];
export type StatusAsyncQuoteCollection = v3Components["schemas"]["Reports_GetStatusAsyncExportQuotes"];
export type Quote = v3Components["schemas"]["Quote"];

// BEGIN: Hack to work around problem of missing saleType='Downgrade' in the OpenAPI spec

// When fixed, we can replace the following with:
// export type SaleType = components["schemas"]["TransactionPurchaseDetails"]["saleType"];
// export type TransactionData = components["schemas"]["Transaction"];

type InternalSaleType = v3Components["schemas"]["TransactionPurchaseDetails"]["saleType"];
export type SaleType = InternalSaleType | 'Downgrade';

// Hack until Atlassian adds the 'SOCIAL_IMPACT' license type to the OpenAPI spec
export type EnhancedLicenseType = v3Components["schemas"]["TransactionPurchaseDetails"]["licenseType"] | 'SOCIAL_IMPACT' | 'SOCIAL_IMPACT_GLOBAL_ACCESS' | 'FOUNDATION_FREE';

interface EnhancedTransactionPurchaseDetails extends Omit<components["schemas"]["TransactionPurchaseDetails"], 'saleType' | 'licenseType'> {
    saleType: SaleType;
    licenseType: EnhancedLicenseType;
}

export interface TransactionData extends Omit<v3Components["schemas"]["Transaction"], 'purchaseDetails'> {
    purchaseDetails: EnhancedTransactionPurchaseDetails;
}
// END: Hack to work around problem of missing saleType='Downgrade' in the OpenAPI spec

export type TransactionDiscount = v3Components["schemas"]["TransactionDiscount"];
export type TransactionDiscountType = v3Components["schemas"]["TransactionDiscount"]["type"];
export type LicenseData = components["schemas"]["License"];
export type PricingData = components["schemas"]["Pricing"];
export type PricingItem = components["schemas"]["PricingItem"];

export type LicenseType = v3Components["schemas"]["TransactionPurchaseDetails"]["licenseType"];
export type HostingType = v3Components["schemas"]["TransactionPurchaseDetails"]["hosting"];
export type BillingPeriod = v3Components["schemas"]["TransactionPurchaseDetails"]["billingPeriod"];
// TODO FIXME!!!!!!!!!!!!!
export type ProratedDetails = components["schemas"]["ProratedDetails"]; // TODO FIXME not in v3 API?
// TODO FIXME!!!!!!!!!!!!!

export type DeploymentType = 'server' | 'datacenter' | 'cloud';