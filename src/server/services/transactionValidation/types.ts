import { Transaction } from "#common/entities/Transaction";
import { components } from "#common/types/marketplace-api";
import { PreviousTransactionResult } from "../PreviousTransactionService";
import { PriceCalcOpts, PriceResult } from "../PriceCalculatorService";

export interface ValidationOptions {
    transaction: Transaction;
    useLegacyPricingTierForCurrent: boolean;
    useLegacyPricingTierForPrevious: boolean;
    expectedDiscount: number;
    hasActualAdjustments: boolean;
    partnerDiscountFraction: number;
    isSandbox: boolean;
    previousPurchaseFindResult: PreviousTransactionResult|undefined;
    expectedDiscountForPreviousPurchase : DiscountResult | undefined;
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