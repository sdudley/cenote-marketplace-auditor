import { components } from './marketplace-api';

// Simplified type names to represent individual components imported from the
// Atlassian Marketplace OpenAPI spec

export type InitiateAsyncLicenseCollection = components["schemas"]["InitiateAsyncLicenseCollection"];
export type InitiateAsyncLicense = components["schemas"]["InitiateAsyncLicense"];
export type InitiateAsyncTransactionCollection = components["schemas"]["InitiateAsyncTransactionCollection"];
export type StatusAsyncTransactionCollection = components["schemas"]["StatusAsyncTransactionCollection"];

// BEGIN: Hack to work around problem of missing saleType='Downgrade' in the OpenAPI spec

// When fixed, we can replace the following with:
// export type SaleType = components["schemas"]["TransactionPurchaseDetails"]["saleType"];
// export type TransactionData = components["schemas"]["Transaction"];

type InternalSaleType = components["schemas"]["TransactionPurchaseDetails"]["saleType"];
export type SaleType = InternalSaleType | 'Downgrade';

interface EnhancedTransactionPurchaseDetails extends Omit<components["schemas"]["TransactionPurchaseDetails"], 'saleType'> {
    saleType: SaleType;
}

export interface TransactionData extends Omit<components["schemas"]["Transaction"], 'purchaseDetails'> {
    purchaseDetails: EnhancedTransactionPurchaseDetails;
}
// END: Hack to work around problem of missing saleType='Downgrade' in the OpenAPI spec

export type TransactionDiscount = components["schemas"]["TransactionDiscount"];
export type TransactionDiscountType = components["schemas"]["TransactionDiscount"]["type"];
export type LicenseData = components["schemas"]["License"];
export type PricingData = components["schemas"]["Pricing"];
export type PricingItem = components["schemas"]["PricingItem"];

export type LicenseType = components["schemas"]["TransactionPurchaseDetails"]["licenseType"];
export type HostingType = components["schemas"]["TransactionPurchaseDetails"]["hosting"];
export type BillingPeriod = components["schemas"]["TransactionPurchaseDetails"]["billingPeriod"];

export type DeploymentType = 'server' | 'datacenter' | 'cloud';