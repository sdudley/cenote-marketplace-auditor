import { PriceCalcDescriptor } from "#server/services/types";

export interface TransactionPricingResponse {
    descriptors: PriceCalcDescriptor[];
    expectedAmount: number;
}