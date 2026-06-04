import { ApportionmentService } from '../ApportionmentService.js';
import { Transaction } from '#common/entities/Transaction.js';
import { TransactionMonthlyApportionmentEntry } from '#common/types/transactionPricing.js';

describe('ApportionmentService', () => {
    const createTransaction = (
        id: string,
        version: number,
        opts: { addonKey: string; hosting: 'Cloud' | 'Data Center' }
    ): Transaction => ({
        id,
        currentVersion: version,
        data: {
            addonKey: opts.addonKey,
            purchaseDetails: { hosting: opts.hosting }
        }
    } as Transaction);

    it('aggregates monthly actual values and transaction references', async () => {
        const transactions = [
            createTransaction('tx-1', 2, { addonKey: 'com.app.a', hosting: 'Cloud' }),
            createTransaction('tx-2', 6, { addonKey: 'com.app.b', hosting: 'Data Center' })
        ];

        const transactionDao = {
            getTransactionsBySaleMonth: jest.fn().mockResolvedValue(transactions)
        };

        const apportionmentByTransaction: Record<string, TransactionMonthlyApportionmentEntry[]> = {
            'tx-1': [
                { month: '2026-06', estimatedValue: 50, actualValue: 55 },
                { month: '2026-07', estimatedValue: 50, actualValue: 45 }
            ],
            'tx-2': [
                { month: '2026-06', estimatedValue: 100, actualValue: 100 },
                { month: '2026-07', estimatedValue: 0, actualValue: 0 }
            ]
        };

        const service = new ApportionmentService(
            transactionDao as any,
            {
                getAddons: jest.fn().mockResolvedValue([
                    { addonKey: 'com.app.a', name: 'App A' },
                    { addonKey: 'com.app.b', name: 'App B' }
                ])
            } as any,
            {} as any,
            {} as any,
            {
                calculateMonthlyPriceApportionment: jest.fn()
            } as any
        );

        jest.spyOn(service, 'calculateApportionmentForTransaction').mockImplementation(async (transaction) => {
            return apportionmentByTransaction[transaction.id] ?? null;
        });

        const result = await service.calculateAggregateApportionment('2026-06');

        expect(result.purchaseMonth).toBe('2026-06');
        expect(result.years).toEqual([{ year: '2026', actualValue: 200 }]);
        expect(result.byAddon).toEqual([
            {
                addonKey: 'com.app.a',
                addonName: 'App A',
                byHosting: [
                    {
                        hosting: 'Cloud',
                        years: [{ year: '2026', actualValue: 100 }]
                    }
                ]
            },
            {
                addonKey: 'com.app.b',
                addonName: 'App B',
                byHosting: [
                    {
                        hosting: 'Data Center',
                        years: [{ year: '2026', actualValue: 100 }]
                    }
                ]
            }
        ]);
        expect(result.months).toEqual([
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
            }
        ]);
    });

    it('skips transactions that cannot be apportioned', async () => {
        const transactions = [
            createTransaction('tx-1', 1, { addonKey: 'com.app.a', hosting: 'Cloud' }),
            createTransaction('tx-2', 1, { addonKey: 'com.app.b', hosting: 'Cloud' })
        ];

        const transactionDao = {
            getTransactionsBySaleMonth: jest.fn().mockResolvedValue(transactions)
        };

        const service = new ApportionmentService(
            transactionDao as any,
            {
                getAddons: jest.fn().mockResolvedValue([{ addonKey: 'com.app.a', name: 'App A' }])
            } as any,
            {} as any,
            {} as any,
            {} as any
        );

        jest.spyOn(service, 'calculateApportionmentForTransaction')
            .mockResolvedValueOnce([{ month: '2026-06', estimatedValue: 10, actualValue: 10 }])
            .mockResolvedValueOnce(null);

        const result = await service.calculateAggregateApportionment('2026-06');

        expect(result.months).toEqual([
            {
                month: '2026-06',
                actualValue: 10,
                transactions: [{
                    transactionId: 'tx-1',
                    transactionVersion: 1,
                    actualAmount: 10,
                    addonKey: 'com.app.a',
                    hosting: 'Cloud'
                }]
            }
        ]);
        expect(result.years).toEqual([{ year: '2026', actualValue: 10 }]);
    });

    it('rebinds months before sale date in calculateApportionmentForTransaction', async () => {
        const transaction = createTransaction('tx-1', 1, { addonKey: 'com.app.a', hosting: 'Cloud' });
        transaction.data.purchaseDetails.saleDate = '2026-06-15';

        const priceCalculator = {
            calculateMonthlyPriceApportionment: jest.fn().mockReturnValue([
                { month: '2026-04', estimatedValue: 20, actualValue: 20 },
                { month: '2026-05', estimatedValue: 30, actualValue: 30 },
                { month: '2026-06', estimatedValue: 40, actualValue: 40 },
                { month: '2026-07', estimatedValue: 10, actualValue: 10 }
            ])
        };

        const service = new ApportionmentService(
            {} as any,
            {} as any,
            {
                getPricingForTransaction: jest.fn().mockResolvedValue({})
            } as any,
            {
                validateTransaction: jest.fn().mockResolvedValue({
                    pricingOpts: {},
                    expectedVendorAmount: 100
                })
            } as any,
            priceCalculator as any
        );

        const result = await service.calculateApportionmentForTransaction(transaction);

        expect(result).toEqual([
            { month: '2026-06', estimatedValue: 90, actualValue: 90 },
            { month: '2026-07', estimatedValue: 10, actualValue: 10 }
        ]);
    });
});
