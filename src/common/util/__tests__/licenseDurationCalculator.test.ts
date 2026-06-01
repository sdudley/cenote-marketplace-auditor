import {
    getMonthsInDateRange,
    getDaysInDateRangeForMonth,
    getLicenseDurationInDays
} from '../licenseDurationCalculator';

describe('getDaysInDateRangeForMonth', () => {
    it('counts days within a single month', () => {
        expect(getDaysInDateRangeForMonth('2026-06-01', '2027-06-01', '2026-06')).toBe(30);
        expect(getDaysInDateRangeForMonth('2026-06-01', '2027-06-01', '2026-07')).toBe(31);
    });

    it('handles partial months at start and end', () => {
        expect(getDaysInDateRangeForMonth('2026-06-15', '2026-08-01', '2026-06')).toBe(16);
        expect(getDaysInDateRangeForMonth('2026-06-15', '2026-08-01', '2026-07')).toBe(31);
    });

    it('returns zero when the month is outside the range', () => {
        expect(getDaysInDateRangeForMonth('2026-06-01', '2026-07-01', '2026-05')).toBe(0);
    });
});

describe('getMonthsInDateRange', () => {
    it('returns all months for a one-year license', () => {
        const months = getMonthsInDateRange('2026-06-01', '2027-06-01');
        expect(months).toHaveLength(12);
        expect(months[0]).toBe('2026-06');
        expect(months[11]).toBe('2027-05');
        expect(months.reduce((sum, month) =>
            sum + getDaysInDateRangeForMonth('2026-06-01', '2027-06-01', month), 0
        )).toBe(getLicenseDurationInDays('2026-06-01', '2027-06-01'));
    });

    it('returns a single month for a short monthly license', () => {
        expect(getMonthsInDateRange('2025-05-01', '2025-06-01')).toEqual(['2025-05']);
    });
});
