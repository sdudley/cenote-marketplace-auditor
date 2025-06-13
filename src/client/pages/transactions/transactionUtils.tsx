import { JsonObject } from "#client/util/collectIds";
import { formatCurrency } from "#common/util/formatCurrency";
import { TransactionData } from '#common/types/marketplace';

export const formatTransactionData = (data: TransactionData): JsonObject => {
    // Deep clone the data to avoid mutating the original
    const formattedData = structuredClone(data);

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