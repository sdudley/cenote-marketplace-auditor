import { JsonObject } from '#client/util/collectIds.js';
import { formatCurrency } from '#common/util/formatCurrency.js';
import { QuoteDetails } from '#common/types/marketplace.js';

function formatListPriceFields(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(formatListPriceFields);
    }
    if (value && typeof value === 'object') {
        const result: JsonObject = {};
        for (const [key, child] of Object.entries(value as JsonObject)) {
            if (key === 'listPrice' && typeof child === 'number') {
                result[key] = formatCurrency(child);
            } else {
                result[key] = formatListPriceFields(child) as JsonObject[keyof JsonObject];
            }
        }
        return result;
    }
    return value;
}

export const formatQuoteDetailsData = (data: QuoteDetails): JsonObject => {
    return formatListPriceFields(structuredClone(data)) as JsonObject;
};
