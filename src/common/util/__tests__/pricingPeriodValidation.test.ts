import { validatePricingPeriods } from '../pricingPeriodValidation.js';

describe('validatePricingPeriods', () => {
    it('allows non-overlapping adjacent periods', () => {
        const existing = [
            { id: 'a', startDate: null, endDate: '2024-01-31' },
            { id: 'b', startDate: '2024-02-01', endDate: null }
        ];

        expect(validatePricingPeriods(existing, { id: 'b', startDate: '2024-02-01', endDate: null })).toBeNull();
    });

    it('rejects overlapping periods that share a boundary day', () => {
        const existing = [
            { id: 'a', startDate: null, endDate: '2024-01-31' }
        ];

        expect(
            validatePricingPeriods(existing, { startDate: '2024-01-31', endDate: null })
        ).toMatch(/overlaps/);
    });

    it('allows only one null start date', () => {
        const existing = [
            { id: 'a', startDate: null, endDate: '2024-01-31' }
        ];

        expect(
            validatePricingPeriods(existing, { startDate: null, endDate: '2023-12-31' })
        ).toMatch(/no start date/);
    });

    it('allows only one null end date', () => {
        const existing = [
            { id: 'a', startDate: '2024-02-01', endDate: null }
        ];

        expect(
            validatePricingPeriods(existing, { startDate: '2023-01-01', endDate: null })
        ).toMatch(/no end date/);
    });

    it('rejects start date after end date', () => {
        expect(
            validatePricingPeriods([], { startDate: '2024-06-01', endDate: '2024-01-01' })
        ).toMatch(/on or before/);
    });
});
