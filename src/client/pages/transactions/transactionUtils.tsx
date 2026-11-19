import { JsonObject } from "#client/util/collectIds.js";
import { formatCurrency } from "#common/util/formatCurrency.js";
import { TransactionData } from '#common/types/marketplace.js';

export const formatTransactionData = (data: TransactionData): JsonObject => {
    // Deep clone the data to avoid mutating the original. TransactionData is plain JSON from the API, but its
    // generated interface has no index signature, so it must be widened to JsonObject explicitly.
    const formattedData = structuredClone(data) as unknown as JsonObject;

    // Format currency values in purchaseDetails
    if (formattedData.purchaseDetails && typeof formattedData.purchaseDetails === 'object') {
        const purchaseDetails = formattedData.purchaseDetails as JsonObject;
        if (typeof purchaseDetails.vendorAmount === 'number') {
            purchaseDetails.vendorAmount = formatCurrency(purchaseDetails.vendorAmount);
        }
        if (typeof purchaseDetails.purchasePrice === 'number') {
            purchaseDetails.purchasePrice = formatCurrency(purchaseDetails.purchasePrice);
        }
    }

    return formattedData;
};