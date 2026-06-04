import {
    MonthlyAggregateApportionmentEntry,
    YearlyApportionmentByAddon,
    YearlyApportionmentEntry
} from '#common/types/apportionment.js';
import { HostingType } from '#common/types/marketplace.js';

function yearFromMonth(month: string): string {
    return month.substring(0, 4);
}

function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
}

function sortYearlyEntries(entries: YearlyApportionmentEntry[]): YearlyApportionmentEntry[] {
    return [...entries].sort((a, b) => a.year.localeCompare(b.year));
}

export function buildYearlyApportionmentFromMonths(
    months: MonthlyAggregateApportionmentEntry[]
): { years: YearlyApportionmentEntry[]; byAddon: YearlyApportionmentByAddon[] } {
    const overallByYear = new Map<string, number>();
    const byAddonMap = new Map<string, Map<HostingType, Map<string, number>>>();

    for (const monthEntry of months) {
        const year = yearFromMonth(monthEntry.month);
        overallByYear.set(year, (overallByYear.get(year) ?? 0) + monthEntry.actualValue);

        for (const transaction of monthEntry.transactions) {
            let hostingMap = byAddonMap.get(transaction.addonKey);
            if (!hostingMap) {
                hostingMap = new Map();
                byAddonMap.set(transaction.addonKey, hostingMap);
            }

            let yearMap = hostingMap.get(transaction.hosting);
            if (!yearMap) {
                yearMap = new Map();
                hostingMap.set(transaction.hosting, yearMap);
            }

            yearMap.set(year, (yearMap.get(year) ?? 0) + transaction.actualAmount);
        }
    }

    const years = sortYearlyEntries(
        [...overallByYear.entries()].map(([year, actualValue]) => ({
            year,
            actualValue: roundCurrency(actualValue)
        }))
    );

    const byAddon = [...byAddonMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([addonKey, hostingMap]) => ({
            addonKey,
            byHosting: [...hostingMap.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([hosting, yearMap]) => ({
                    hosting,
                    years: sortYearlyEntries(
                        [...yearMap.entries()].map(([year, actualValue]) => ({
                            year,
                            actualValue: roundCurrency(actualValue)
                        }))
                    )
                }))
        }));

    return { years, byAddon };
}
