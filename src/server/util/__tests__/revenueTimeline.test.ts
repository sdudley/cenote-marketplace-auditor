import { buildRevenueTimeline, revenueBeforeDate } from '../revenueTimeline.js';

describe('buildRevenueTimeline', () => {
    it('orders by date and accumulates', () => {
        const timeline = buildRevenueTimeline([
            { saleDate: '2026-03-01', revenue: 50 },
            { saleDate: '2026-01-01', revenue: 100 },
            { saleDate: '2026-02-01', revenue: -30 }
        ]);

        expect(timeline).toEqual([
            { saleDate: '2026-01-01', cumulativeRevenue: 100 },
            { saleDate: '2026-02-01', cumulativeRevenue: 70 },
            { saleDate: '2026-03-01', cumulativeRevenue: 120 }
        ]);
    });

    it('merges duplicate dates', () => {
        expect(buildRevenueTimeline([
            { saleDate: '2026-01-01', revenue: 10 },
            { saleDate: '2026-01-01', revenue: 5 }
        ])).toEqual([{ saleDate: '2026-01-01', cumulativeRevenue: 15 }]);
    });

    it('returns an empty timeline for no data', () => {
        expect(buildRevenueTimeline([])).toEqual([]);
    });
});

describe('revenueBeforeDate', () => {
    const timeline = buildRevenueTimeline([
        { saleDate: '2026-01-10', revenue: 100 },
        { saleDate: '2026-02-10', revenue: 200 },
        { saleDate: '2026-03-10', revenue: -50 }
    ]);

    it('is 0 for an empty timeline or before the first sale', () => {
        expect(revenueBeforeDate([], '2026-06-01')).toBe(0);
        expect(revenueBeforeDate(timeline, '2025-12-31')).toBe(0);
        expect(revenueBeforeDate(timeline, '2026-01-10')).toBe(0);
    });

    it('excludes revenue booked on the date itself', () => {
        expect(revenueBeforeDate(timeline, '2026-01-11')).toBe(100);
        expect(revenueBeforeDate(timeline, '2026-02-10')).toBe(100);
    });

    it('uses the latest entry before the date, including between and after entries', () => {
        expect(revenueBeforeDate(timeline, '2026-02-11')).toBe(300);
        expect(revenueBeforeDate(timeline, '2026-02-28')).toBe(300);
        expect(revenueBeforeDate(timeline, '2026-03-11')).toBe(250);
        expect(revenueBeforeDate(timeline, '2030-01-01')).toBe(250);
    });
});
