import { rebindApportionmentBeforeSaleMonth } from '../apportionmentSaleMonthRebinding.js';
import { TransactionMonthlyApportionmentEntry } from '#common/types/transactionPricing.js';

describe('rebindApportionmentBeforeSaleMonth', () => {
    const entries: TransactionMonthlyApportionmentEntry[] = [
        { month: '2026-04', estimatedValue: 30, actualValue: 31 },
        { month: '2026-05', estimatedValue: 30, actualValue: 29 },
        { month: '2026-06', estimatedValue: 40, actualValue: 40 },
        { month: '2026-07', estimatedValue: 50, actualValue: 50 }
    ];

    it('merges months before the sale month into the sale month', () => {
        const result = rebindApportionmentBeforeSaleMonth(entries, '2026-06-15');

        expect(result).toEqual([
            { month: '2026-06', estimatedValue: 100, actualValue: 100 },
            { month: '2026-07', estimatedValue: 50, actualValue: 50 }
        ]);
    });

    it('leaves entries unchanged when all months are on or after the sale month', () => {
        const result = rebindApportionmentBeforeSaleMonth(entries, '2026-04-01');

        expect(result).toEqual(entries);
    });

    it('bins all pre-sale amounts into the sale month when license starts before sale', () => {
        const result = rebindApportionmentBeforeSaleMonth(entries, '2026-07-01');

        expect(result).toEqual([
            { month: '2026-07', estimatedValue: 150, actualValue: 150 }
        ]);
    });
});
