import { Transaction } from "#common/entities/Transaction.js";
import { components } from "#common/types/marketplace-api.js";

import { PreviousTransactionResult, PriceCalcOpts, PriceResult } from '#server/services/types.js';

export interface ValidationOptions {
    transaction: Transaction;
    useLegacyPricingTierForCurrent: boolean;
    useLegacyPricingTierForPrevious: boolean;
    expectedDiscount: number;
    hasActualAdjustments: boolean;
    isSandbox: boolean;
    previousPurchaseFindResult: PreviousTransactionResult|undefined;
    expectedDiscountForPreviousPurchase : DiscountResult | undefined;
    /** For MQB (prorated) transactions: license size from the overlapping full-period transaction. Resolved by ValidationService when not provided. */
    mqbLicenseUserCount?: number;
    /** Optional override for discount-date selection used by pricing calculation. */
    discountReferenceSaleDate?: string;
}

export type PurchaseDetails = components['schemas']['TransactionPurchaseDetails'];

export interface PriceWithPricingOpts {
    price: PriceResult;
    pricingOpts: PriceCalcOpts;
}

export interface TransactionValidationResult {
    isExpectedPrice: boolean;
    valid: boolean;
    vendorAmount: number;
    price: PriceResult;
    expectedVendorAmount: number;
    notes: string[];
    pricingOpts: PriceCalcOpts;
    legacyPricingEndDate: string|undefined;
    previousPurchaseLegacyPricingEndDate: string|undefined;
    useLegacyPricingTierForCurrent: boolean;
    expectedDiscountApplied: number;
    hasActualAdjustments: boolean;
}

export interface LegacyPricePermutation {
    useLegacyPricingTierForCurrent: boolean;
    useLegacyPricingTierForPrevious: boolean;
}

export interface DiscountResult {
    discountToUse: number;
    hasExpectedAdjustments: boolean;
    hasActualAdjustments: boolean;
    adjustmentNotes: string[];
}