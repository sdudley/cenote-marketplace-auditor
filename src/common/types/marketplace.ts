import { components } from './marketplace-api';

export type InitiateAsyncLicenseCollection = components["schemas"]["InitiateAsyncLicenseCollection"];
export type InitiateAsyncLicense = components["schemas"]["InitiateAsyncLicense"];
export type InitiateAsyncTransactionCollection = components["schemas"]["InitiateAsyncTransactionCollection"];
export type StatusAsyncTransactionCollection = components["schemas"]["StatusAsyncTransactionCollection"];

export type TransactionData = components["schemas"]["Transaction"];
export type LicenseData = components["schemas"]["License"];
export type PricingData = components["schemas"]["Pricing"];
export type PricingItem = components["schemas"]["PricingItem"];

export type LicenseType = components["schemas"]["TransactionPurchaseDetails"]["licenseType"];
export type SaleType = components["schemas"]["TransactionPurchaseDetails"]["saleType"];
export type HostingType = components["schemas"]["TransactionPurchaseDetails"]["hosting"];
export type BillingPeriod = components["schemas"]["TransactionPurchaseDetails"]["billingPeriod"];

export type DeploymentType = 'server' | 'datacenter' | 'cloud';