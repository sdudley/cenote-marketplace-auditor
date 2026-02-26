import { PriceCalcDescriptor, PriceCalcOpts } from "#server/services/types";
import { PricingTierResult } from "#common/types/pricingTierResult";

export interface TransactionPricingResponse {
    descriptors: PriceCalcDescriptor[];
    expectedAmount: number;
}

/** Response for price-test-snippet: data to generate a PriceCalculatorService test from live transaction. */
export interface PriceTestSnippetResponse {
    pricingTierResult: PricingTierResult;
    pricingOpts: PriceCalcOpts;
    purchasePrice: number;
    vendorAmount: number;
    dailyNominalPrice: number;
}