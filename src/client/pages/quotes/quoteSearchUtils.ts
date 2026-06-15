import { Quote } from '#common/types/marketplace.js';

function collectSearchableValues(value: unknown): string[] {
    if (value === null || value === undefined) {
        return [];
    }
    if (typeof value === 'object') {
        if (Array.isArray(value)) {
            return value.flatMap(collectSearchableValues);
        }
        return Object.values(value as Record<string, unknown>).flatMap(collectSearchableValues);
    }
    return [String(value)];
}

export function quoteMatchesSearch(quote: Quote, search: string): boolean {
    const term = search.trim().toLowerCase();
    if (!term) {
        return true;
    }
    const haystack = collectSearchableValues(quote).join(' ').toLowerCase();
    return haystack.includes(term);
}
