import { PriceCalcDescriptor, PriceCalcOpts } from "#server/services/types.js";
import { PricingTierResult } from "#common/types/pricingTierResult.js";

export interface TransactionPricingResponse {
    descriptors: PriceCalcDescriptor[];
    expectedAmount: number;
}

export interface TransactionMonthlyApportionmentEntry {
    month: string;
    estimatedValue: number;
    actualValue: number;
}

export interface TransactionMonthlyApportionmentResponse {
    months: TransactionMonthlyApportionmentEntry[];
}

/** Response for price-test-snippet: data to generate a PriceCalculatorService test from live transaction. */
export interface PriceTestSnippetResponse {
    pricingTierResult: PricingTierResult;
    pricingOpts: PriceCalcOpts;
    purchasePrice: number;
    vendorAmount: number;
    dailyNominalPrice: number;
}