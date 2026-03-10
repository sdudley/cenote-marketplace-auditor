/**
 * Utility functions for determining display IDs in licenses and transactions
 */

import { LicenseData, TransactionData } from "#common/types/marketplace";

/**
 * Determines the appropriate ID to display based on hosting type and availability
 */
export const getDisplayId = (hosting: string | null, licenseId?: string | null, entitlementId?: string | null): string => {
  if (licenseId && (hosting==='Data Center' || hosting==='Server')) {
    return licenseId;
  }
  return entitlementId || '';
};

/**
 * Gets the display ID for licenses with proper fallback handling
 */
export const getLicenseDisplayId = (licenseData: LicenseData): string => {
  return getDisplayId(licenseData.hosting, licenseData.licenseId, licenseData.appEntitlementNumber);
};

/**
 * Gets the display ID for transactions with proper fallback handling
 */
export const getTransactionDisplayId = (transactionData: TransactionData): string => {
  const hosting = transactionData.purchaseDetails?.hosting;
  const licenseId = transactionData.licenseId;
  const entitlementNumber = transactionData.appEntitlementNumber;

  return getDisplayId(hosting, licenseId, entitlementNumber);
};