import { Quote } from '#common/types/marketplace.js';
import { SortOrder } from '../../components/SortableHeader';
import { QuoteQuerySortType } from './quoteColumns';

function getQuoteSortValue(quote: Quote, sortBy: QuoteQuerySortType): string {
    switch (sortBy) {
        case QuoteQuerySortType.CreatedDate:
            return quote.quoteCreatedDate ?? '';
        case QuoteQuerySortType.ExpiryDate:
            return quote.quoteExpiryDate ?? '';
        case QuoteQuerySortType.StartDate:
            return quote.startDate ?? '';
        case QuoteQuerySortType.EndDate:
            return quote.endDate ?? '';
    }
}

export function sortQuotes(quotes: Quote[], sortBy: QuoteQuerySortType, sortOrder: SortOrder): Quote[] {
    return [...quotes].sort((a, b) => {
        const comparison = getQuoteSortValue(a, sortBy).localeCompare(getQuoteSortValue(b, sortBy));
        return sortOrder === 'ASC' ? comparison : -comparison;
    });
}
