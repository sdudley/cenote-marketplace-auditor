import { TransactionMonthlyApportionmentEntry } from '#common/types/transactionPricing.js';

function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
}

export function saleMonthFromDate(saleDate: string): string {
    return saleDate.substring(0, 7);
}

/**
 * Rolls apportionment for calendar months before the sale month into the sale month.
 * Subscription length and per-day weights are unchanged; only the reporting bins move.
 */
export function rebindApportionmentBeforeSaleMonth(
    entries: TransactionMonthlyApportionmentEntry[],
    saleDate: string
): TransactionMonthlyApportionmentEntry[] {
    const saleMonth = saleMonthFromDate(saleDate);
    const rebinned = new Map<string, { estimatedValue: number; actualValue: number }>();

    for (const entry of entries) {
        const targetMonth = entry.month < saleMonth ? saleMonth : entry.month;
        const existing = rebinned.get(targetMonth) ?? { estimatedValue: 0, actualValue: 0 };
        existing.estimatedValue += entry.estimatedValue;
        existing.actualValue += entry.actualValue;
        rebinned.set(targetMonth, existing);
    }

    return [...rebinned.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, values]) => ({
            month,
            estimatedValue: roundCurrency(values.estimatedValue),
            actualValue: roundCurrency(values.actualValue)
        }));
}
