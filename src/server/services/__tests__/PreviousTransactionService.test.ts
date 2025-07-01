import { PreviousTransactionService } from '../PreviousTransactionService';
import { Transaction } from '../../../common/entities/Transaction';
import { TransactionDao } from '../../database/dao/TransactionDao';
import { SaleType } from '../../../common/types/marketplace';

let uniqueTransactionId = 0;

describe('PreviousTransactionService', () => {
    let service: PreviousTransactionService;
    let transactionDao: jest.Mocked<TransactionDao>;

    beforeEach(() => {
        // Create a mock TransactionDao
        transactionDao = {
            loadRelatedTransactions: jest.fn()
        } as any;

        // Create the service under test with direct injection
        service = new PreviousTransactionService(transactionDao);
    });

    describe('findPreviousTransaction', () => {
        it('should return undefined when no previous transactions exist', async () => {
            const transaction = createTransaction('2024-01-01', '2024-12-31', '2023-12-30');
            transactionDao.loadRelatedTransactions.mockResolvedValue([transaction]);

            const result = await service.findPreviousTransaction(transaction);

            expect(result).toBeUndefined();
        });

        it('should find the most recent non-refunded transaction', async () => {
            const t1 = createTransaction('2023-01-01', '2023-12-31', '2022-12-30');
            const t2 = createTransaction('2024-01-01', '2024-12-31', '2023-12-30');

            transactionDao.loadRelatedTransactions.mockResolvedValue([
                t2,
                t1
            ]);

            const result = await service.findPreviousTransaction(t2);

            expect(result).toEqual({
                transaction: t1,
                effectiveMaintenanceEndDate: '2023-12-31'
            });
        });

        it('should handle a fully refunded previous transaction', async () => {
            const t1 = createTransaction('2023-01-01', '2023-12-31', '2022-12-30');
            const t2 = createTransaction('2023-01-01', '2023-12-31', '2023-01-15', 'Refund');
            const t3 = createTransaction('2024-01-01', '2024-12-31', '2023-12-30');

            transactionDao.loadRelatedTransactions.mockResolvedValue([
                t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t3);

            expect(result).toBeUndefined();
        });

        it('should handle a partially refunded previous transaction when the end of the transaction is refunded', async () => {
            const t1 = createTransaction('2023-01-01', '2023-12-31', '2022-12-30');
            const t2 = createTransaction('2023-07-01', '2023-12-31', '2023-06-30', 'Refund');
            const t3 = createTransaction('2024-01-01', '2024-12-31', '2023-12-30');

            transactionDao.loadRelatedTransactions.mockResolvedValue([
                t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t3);

            expect(result).toEqual({
                transaction: t1,
                effectiveMaintenanceEndDate: '2023-07-01'
            });
        });

        it('should handle multiple overlapping transactions', async () => {
            const t1 = createTransaction('2022-01-01', '2022-12-31', '2021-12-30');
            const t2 = createTransaction('2023-01-01', '2023-12-31', '2022-12-30');
            const t3 = createTransaction('2023-07-01', '2023-12-31', '2023-06-30', 'Refund');
            const t4 = createTransaction('2024-01-01', '2024-12-31', '2023-12-30');

            transactionDao.loadRelatedTransactions.mockResolvedValue([
                t4,
                t3,
                t2,
                t1
            ]);

            const result = await service.findPreviousTransaction(t4);

            expect(result).toEqual({
                transaction: t2,
                effectiveMaintenanceEndDate: '2023-07-01'
            });
        });

        it('should handle same-day sale and refund when sale comes first', async () => {
            const t1 = createTransaction('2023-01-01', '2023-12-31', '2023-01-01', 'Refund');
            const t2 = createTransaction('2023-01-01', '2023-12-31', '2023-01-01', 'New', );
            const t3 = createTransaction('2024-01-01', '2024-12-31', '2023-12-30');

            transactionDao.loadRelatedTransactions.mockResolvedValue([
                t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t3);

            expect(result).toBeUndefined();
        });

        it('should handle same-day sale and refund when refund comes first', async () => {
            const t1 = createTransaction('2023-01-01', '2023-12-31', '2023-01-01', 'New');
            const t2 = createTransaction('2023-01-01', '2023-12-31', '2023-01-01', 'Refund', );
            const t3 = createTransaction('2024-01-01', '2024-12-31', '2023-12-30');

            transactionDao.loadRelatedTransactions.mockResolvedValue([
                t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t3);

            expect(result).toBeUndefined();
        });

        it('should handle renewals after a partial refund of the end of the tranx', async () => {
            const t1 = createTransaction('2024-01-01', '2024-12-31', '2023-12-30', 'New');
            const t2 = createTransaction('2024-07-01', '2024-12-31', '2024-06-30', 'Refund');
            const t3 = createTransaction('2024-07-05', '2025-04-30', '2024-06-30');

            transactionDao.loadRelatedTransactions.mockResolvedValue([
                t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t3);

            expect(result).toEqual({
                transaction: t1,
                effectiveMaintenanceEndDate: '2024-07-01'
            })
        });

        it('should handle renewals after a partial refund of the beginning of the previous tranx', async () => {
            const t1 = createTransaction('2024-01-01', '2024-12-31', '2023-12-30', 'New');
            const t2 = createTransaction('2024-01-01', '2024-04-30', '2024-06-30', 'Refund');
            const t3 = createTransaction('2024-12-31', '2025-04-30', '2024-06-30');

            transactionDao.loadRelatedTransactions.mockResolvedValue([
                t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t3);

            expect(result).toEqual({
                transaction: t1,
                effectiveMaintenanceEndDate: '2024-04-30'
            })
        });

        it('should ignore refunds dated after the current transaction sale date', async () => {
            const t1 = createTransaction('2024-01-01', '2024-12-31', '2023-12-30', 'New');
            const t2 = createTransaction('2024-12-31', '2025-04-30', '2024-05-30'); // Sale date before refund date
            const t3 = createTransaction('2024-01-01', '2024-12-31', '2024-06-30', 'Refund'); // Refund dated after t3's sale date

            transactionDao.loadRelatedTransactions.mockResolvedValue([
                t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t2);

            expect(result).toEqual({
                transaction: t1,
                effectiveMaintenanceEndDate: '2024-12-31' // Full period since refund is ignored
            })
        });

        it('should permit multiple refunds', async () => {
            const t1 = createTransaction('2024-01-01', '2025-01-01', '2023-12-30', 'New');
            const t2 = createTransaction('2025-01-01', '2026-01-01', '2024-12-30', 'Renewal');
            const t3 = createTransaction('2025-01-01', '2026-01-01', '2024-12-30', 'Refund');
            const t4 = createTransaction('2025-01-01', '2026-01-01', '2024-12-31', 'Renewal');
            const t5 = createTransaction('2026-01-01', '2027-01-01', '2025-12-30', 'Renewal');
            const t6 = createTransaction('2026-01-01', '2027-01-01', '2026-01-14', 'Refund');
            const t7 = createTransaction('2026-01-01', '2027-01-01', '2026-01-15', 'Renewal');

            transactionDao.loadRelatedTransactions.mockResolvedValue([
                t6, t5, t4, t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t4);

            expect(result).toEqual({
                transaction: t1,
                effectiveMaintenanceEndDate: '2025-01-01'
            })

            const result2 = await service.findPreviousTransaction(t5);

            expect(result2).toEqual({
                transaction: t4,
                effectiveMaintenanceEndDate: '2026-01-01'
            })

            const result3 = await service.findPreviousTransaction(t7);

            expect(result3).toEqual({
                transaction: t4,
                effectiveMaintenanceEndDate: '2026-01-01'
            })
        });

        it('should still find previous transactions with overlapping dates', async () => {
            const t1 = createTransaction('2023-12-31', '2024-12-31', '2023-12-30', 'New');
            const t2 = createTransaction('2024-12-31', '2025-12-31', '2024-12-30', 'Renewal');
            const t3 = createTransaction('2025-06-01', '2025-12-31', '2025-05-30', 'Upgrade');

            transactionDao.loadRelatedTransactions.mockResolvedValue([
                t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t3);

            expect(result).toEqual({
                transaction: t2,
                effectiveMaintenanceEndDate: '2025-12-31'
            })

            const result2 = await service.findPreviousTransaction(t2);

            expect(result2).toEqual({
                transaction: t1,
                effectiveMaintenanceEndDate: '2024-12-31'
            })
        });

        it('should permit renewals after refunded upgrade', async () => {
            const t1 = createTransaction('2023-12-31', '2024-12-31', '2023-12-30', 'New');
            const t2 = createTransaction('2024-12-31', '2025-12-31', '2024-12-30', 'Renewal');
            const t3 = createTransaction('2025-06-01', '2025-12-31', '2025-05-30', 'Upgrade');
            const t4 = createTransaction('2025-06-01', '2025-12-31', '2025-06-01', 'Refund');
            const t5 = createTransaction('2025-12-31', '2026-12-31', '2025-06-02', 'Renewal');

            transactionDao.loadRelatedTransactions.mockResolvedValue([
                t5, t4, t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t5);

            expect(result).toEqual({
                transaction: t2,
                effectiveMaintenanceEndDate: '2025-12-31'
            })
        });

        it('should handle 0-day renewals and match refunds to the same tier', async () => {
            const t1 = createTransaction('2022-12-01', '2023-12-01', '2022-11-30', 'New',     '500 Users');
            const t2 = createTransaction('2023-12-01', '2024-12-01', '2023-12-05', 'Upgrade', '1000 Users'); // upgrade for 2023-2024, but later refundeed by t6
            const t3 = createTransaction('2023-12-01', '2023-12-01', '2023-12-19', 'Renewal', '1000 Users'); // weird Atlassian 0-day tranx for prior period
            const t4 = createTransaction('2023-12-01', '2023-12-01', '2023-12-20', 'Renewal', '500 Users');  // weird Atlassian 0-day tranx for prior period
            const t5 = createTransaction('2023-12-01', '2024-12-01', '2023-12-20', 'Renewal', '500 Users');  // correct one-year renewal at 500 users overlapping with to-be-refunded upgrade in t2
            const t6 = createTransaction('2023-12-01', '2024-12-01', '2023-12-20', 'Refund',  '1000 Users'); // refund of t2
            const t7 = createTransaction('2024-01-18', '2024-12-01', '2024-01-16', 'Upgrade', '1000 Users'); // now upgrade from t5
            const t8 = createTransaction('2024-12-01', '2025-12-01', '2024-11-29', 'Renewal', '1000 Users');

            transactionDao.loadRelatedTransactions.mockResolvedValue([
                t8, t7, t6, t5, t4, t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t7);

            expect(result).toEqual({
                transaction: t5,
                effectiveMaintenanceEndDate: '2024-12-01'
            });
        });

        it('should handle multiple refunds of different periods within the same original purchase', async () => {
            const t1 = createTransaction('2025-01-20', '2026-12-12', '2025-01-17', 'New',     '2000 Users'); // original purchase
            const t2 = createTransaction('2025-05-23', '2025-12-12', '2025-05-23', 'Refund',  '2000 Users'); // refund prorated first year
            const t3 = createTransaction('2025-12-12', '2026-12-12', '2025-05-23', 'Refund',  '2000 Users'); // refund all of second year
            const t4 = createTransaction('2025-05-23', '2025-12-12', '2025-05-23', 'Upgrade', '2500 Users'); // upgrade from t1
            const t5 = createTransaction('2025-12-12', '2026-12-12', '2025-05-23', 'Renewal', '2500 Users'); // renewal of t4

            transactionDao.loadRelatedTransactions.mockResolvedValue([
                t5, t4, t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t4);

            expect(result).toEqual({
                transaction: t1,
                effectiveMaintenanceEndDate: '2025-05-23'
            });

            const result2 = await service.findPreviousTransaction(t5);

            expect(result2).toEqual({
                transaction: t4,
                effectiveMaintenanceEndDate: '2025-12-12'
            });
        });

        it('should handle interspersed refunds with $0 sales', async () => {
            const t1 = createTransaction('2021-02-28', '2022-02-28', '2021-02-26', 'New', '500 Users');
            const t2 = createTransaction('2022-01-14', '2023-02-28', '2022-02-23', 'Upgrade', '1000 Users');
            const t3 = createTransaction('2023-02-28', '2024-02-28', '2023-02-15', 'Renewal', '1000 Users');
            const t4 = createTransaction('2024-02-28', '2026-02-28', '2024-02-27', 'Upgrade', '2000 Users');
            const t5 = createTransaction('2024-02-28', '2026-02-28', '2024-03-01', 'Refund', '2000 Users');
            const t6 = createTransaction('2024-02-28', '2024-02-28', '2024-03-01', 'Renewal', '2000 Users'); // 0-day renewal
            const t7 = createTransaction('2024-02-28', '2026-02-28', '2024-03-07', 'Renewal', '2000 Users');

            transactionDao.loadRelatedTransactions.mockResolvedValue([
                t7, t6, t5, t4, t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t4);

            expect(result).toEqual({
                transaction: t3,
                effectiveMaintenanceEndDate: '2024-02-28'
            });

            const result2 = await service.findPreviousTransaction(t7);

            expect(result2).toEqual({
                transaction: t3,
                effectiveMaintenanceEndDate: '2024-02-28'
            });
        });
    });
});

function createTransaction(startDate: string, endDate: string, saleDate: string, saleType: SaleType = 'New', tier: string = 'Unknown Tier'): Transaction {
    const transaction = new Transaction();
    transaction.id = '' + uniqueTransactionId++;
    transaction.data = {
        purchaseDetails: {
            saleDate,
            saleType,
            maintenanceStartDate: startDate,
            maintenanceEndDate: endDate,
            tier
        }
    } as any;
    return transaction;
}