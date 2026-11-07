/** Total revenue booked on a single sale date, across all apps. Refunds are negative. */
export interface DailyRevenue {
    saleDate: string; // YYYY-MM-DD
    revenue: number;
}

/** Cumulative revenue through (and including) `saleDate`. */
export interface RevenueTimelineEntry {
    saleDate: string;
    cumulativeRevenue: number;
}

/** Builds a date-ordered cumulative revenue timeline from per-day totals (input order does not matter). */
export function buildRevenueTimeline(daily: DailyRevenue[]): RevenueTimelineEntry[] {
    const byDate = new Map<string, number>();

    for (const { saleDate, revenue } of daily) {
        byDate.set(saleDate, (byDate.get(saleDate) ?? 0) + revenue);
    }

    let cumulativeRevenue = 0;

    return [...byDate.entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([saleDate, revenue]) => {
            cumulativeRevenue += revenue;
            return { saleDate, cumulativeRevenue };
        });
}

/**
 * Revenue accumulated strictly before `date` (YYYY-MM-DD). Revenue booked on `date` itself is excluded, so a sale
 * never counts towards its own threshold check and same-day ordering cannot change the result.
 */
export function revenueBeforeDate(timeline: RevenueTimelineEntry[], date: string): number {
    let lo = 0;
    let hi = timeline.length; // find the first entry with saleDate >= date

    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (timeline[mid].saleDate < date) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }

    return lo === 0 ? 0 : timeline[lo - 1].cumulativeRevenue;
}
