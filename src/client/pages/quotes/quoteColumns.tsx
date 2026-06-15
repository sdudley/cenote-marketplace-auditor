import { ColumnConfig } from '../../components/ColumnConfig';
import { Quote } from '#common/types/marketplace.js';
import { EntitlementIdLink } from '#client/components/styles.js';
import { isoStringWithOnlyDate } from '#common/util/dateUtils.js';

export interface QuoteCellContext {}

function formatQuoteDate(date?: string): string {
    if (!date) {
        return '';
    }
    return isoStringWithOnlyDate(date);
}

function formatUserTier(userTier?: number): string {
    if (userTier === undefined || userTier === null) {
        return '';
    }
    return userTier === -1 ? 'Unlimited' : userTier.toString();
}

function formatListPrice(listPrice?: number): string {
    if (listPrice === undefined || listPrice === null) {
        return '';
    }
    return `$${listPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const defaultQuoteColumns: ColumnConfig<Quote, QuoteCellContext, string>[] = [
    {
        id: 'quoteCreatedDate',
        label: 'Created Date',
        visible: true,
        renderSimpleCell: (quote) => formatQuoteDate(quote.quoteCreatedDate),
    },
    {
        id: 'quoteNumber',
        label: 'Quote Number',
        visible: true,
        nowrap: true,
        renderSimpleCell: (quote) => quote.quoteNumber ?? '',
    },
    {
        id: 'company',
        label: 'Company',
        visible: true,
        renderSimpleCell: (quote) => quote.technicalContactCompany ?? '',
    },
    {
        id: 'quoteStatus',
        label: 'Status',
        visible: true,
        renderSimpleCell: (quote) => quote.quoteStatus ?? '',
    },
    {
        id: 'quoteExpiryDate',
        label: 'Expiry Date',
        visible: true,
        renderSimpleCell: (quote) => formatQuoteDate(quote.quoteExpiryDate),
    },
    {
        id: 'entitlementNumber',
        label: 'Entitlement Number',
        visible: true,
        nowrap: true,
        renderSimpleCell: (quote) => {
            const entitlementNumber = quote.entitlementNumber ?? '';
            if (!entitlementNumber) {
                return '';
            }
            return (
                <EntitlementIdLink to={`/transactions?search=${encodeURIComponent(entitlementNumber)}`}>
                    {entitlementNumber}
                </EntitlementIdLink>
            );
        },
    },
    {
        id: 'productName',
        label: 'Product Name',
        visible: true,
        renderSimpleCell: (quote) => quote.productName ?? '',
    },
    {
        id: 'startDate',
        label: 'Start Date',
        visible: true,
        renderSimpleCell: (quote) => formatQuoteDate(quote.startDate),
    },
    {
        id: 'endDate',
        label: 'End Date',
        visible: true,
        renderSimpleCell: (quote) => formatQuoteDate(quote.endDate),
    },
    {
        id: 'userTier',
        label: 'User Tier',
        visible: true,
        align: 'right',
        renderSimpleCell: (quote) => formatUserTier(quote.userTier),
    },
    {
        id: 'listPrice',
        label: 'List Price',
        visible: true,
        align: 'right',
        renderSimpleCell: (quote) => formatListPrice(quote.listPrice),
    },
];
