import { parsePurchaseMonth, isValidPurchaseMonth, getPriorPurchaseMonth } from '../purchaseMonthUtils';

describe('parsePurchaseMonth', () => {
    it('parses a valid month into date range', () => {
        expect(parsePurchaseMonth('2026-06')).toEqual({
            year: 2026,
            month: 6,
            startDate: '2026-06-01',
            endDate: '2026-07-01'
        });
    });

    it('handles December rollover', () => {
        expect(parsePurchaseMonth('2026-12')).toEqual({
            year: 2026,
            month: 12,
            startDate: '2026-12-01',
            endDate: '2027-01-01'
        });
    });

    it('rejects invalid formats', () => {
        expect(() => parsePurchaseMonth('2026-13')).toThrow();
        expect(() => parsePurchaseMonth('2026-6')).toThrow();
        expect(() => parsePurchaseMonth('invalid')).toThrow();
    });
});

describe('isValidPurchaseMonth', () => {
    it('accepts valid months', () => {
        expect(isValidPurchaseMonth('2026-06')).toBe(true);
        expect(isValidPurchaseMonth('2026-12')).toBe(true);
    });

    it('rejects invalid months', () => {
        expect(isValidPurchaseMonth('2026-13')).toBe(false);
        expect(isValidPurchaseMonth('2026-6')).toBe(false);
        expect(isValidPurchaseMonth('')).toBe(false);
    });
});

describe('getPriorPurchaseMonth', () => {
    it('returns the previous calendar month', () => {
        expect(getPriorPurchaseMonth(new Date('2026-06-15'))).toBe('2026-05');
        expect(getPriorPurchaseMonth(new Date('2026-01-10'))).toBe('2025-12');
    });
});
