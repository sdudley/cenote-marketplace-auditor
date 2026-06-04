import { buildYearlyApportionmentFromMonths } from '../apportionmentAggregation.js';
import { MonthlyAggregateApportionmentEntry } from '#common/types/apportionment.js';

describe('buildYearlyApportionmentFromMonths', () => {
    const months: MonthlyAggregateApportionmentEntry[] = [
        {
            month: '2026-06',
            actualValue: 155,
            transactions: [
                {
                    transactionId: 'tx-1',
                    transactionVersion: 2,
                    actualAmount: 55,
                    addonKey: 'com.app.a',
                    hosting: 'Cloud'
                },
                {
                    transactionId: 'tx-2',
                    transactionVersion: 6,
                    actualAmount: 100,
                    addonKey: 'com.app.b',
                    hosting: 'Data Center'
                }
            ]
        },
        {
            month: '2026-07',
            actualValue: 45,
            transactions: [
                {
                    transactionId: 'tx-1',
                    transactionVersion: 2,
                    actualAmount: 45,
                    addonKey: 'com.app.a',
                    hosting: 'Cloud'
                }
            ]
        },
        {
            month: '2027-01',
            actualValue: 20,
            transactions: [
                {
                    transactionId: 'tx-3',
                    transactionVersion: 1,
                    actualAmount: 20,
                    addonKey: 'com.app.a',
                    hosting: 'Cloud'
                }
            ]
        }
    ];

    it('sums overall totals by calendar year from monthly data', () => {
        const { years } = buildYearlyApportionmentFromMonths(months);

        expect(years).toEqual([
            { year: '2026', actualValue: 200 },
            { year: '2027', actualValue: 20 }
        ]);
    });

    it('builds per-addon and per-hosting yearly breakdowns from transaction amounts', () => {
        const { byAddon } = buildYearlyApportionmentFromMonths(months);

        expect(byAddon).toEqual([
            {
                addonKey: 'com.app.a',
                byHosting: [
                    {
                        hosting: 'Cloud',
                        years: [
                            { year: '2026', actualValue: 100 },
                            { year: '2027', actualValue: 20 }
                        ]
                    }
                ]
            },
            {
                addonKey: 'com.app.b',
                byHosting: [
                    {
                        hosting: 'Data Center',
                        years: [{ year: '2026', actualValue: 100 }]
                    }
                ]
            }
        ]);
    });
});
