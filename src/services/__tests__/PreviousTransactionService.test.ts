import { PreviousTransactionService } from '../PreviousTransactionService';
import { Transaction } from '../../entities/Transaction';
import TransactionDaoService from '../TransactionDaoService';

let uniqueTransactionId = 0;

describe('PreviousTransactionService', () => {
    let service: PreviousTransactionService;
    let transactionDaoService: jest.Mocked<TransactionDaoService>;

    beforeEach(() => {
        // Create a mock TransactionDaoService
        transactionDaoService = {
            loadRelatedTransactions: jest.fn()
        } as any;

        // Create the service under test with direct injection
        service = new PreviousTransactionService(transactionDaoService);
    });

    describe('findPreviousTransaction', () => {
        it('should return undefined when no previous transactions exist', async () => {
            const transaction = createTransaction('2024-01-01', '2024-12-31', '2023-12-30');
            transactionDaoService.loadRelatedTransactions.mockResolvedValue([transaction]);

            const result = await service.findPreviousTransaction(transaction);

            expect(result).toBeUndefined();
        });

        it('should find the most recent non-refunded transaction', async () => {
            const t1 = createTransaction('2023-01-01', '2023-12-31', '2022-12-30');
            const t2 = createTransaction('2024-01-01', '2024-12-31', '2023-12-30');

            transactionDaoService.loadRelatedTransactions.mockResolvedValue([
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

            transactionDaoService.loadRelatedTransactions.mockResolvedValue([
                t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t3);

            expect(result).toBeUndefined();
        });

        it('should handle a partially refunded previous transaction when the end of the transaction is refunded', async () => {
            const t1 = createTransaction('2023-01-01', '2023-12-31', '2022-12-30');
            const t2 = createTransaction('2023-07-01', '2023-12-31', '2023-06-30', 'Refund');
            const t3 = createTransaction('2024-01-01', '2024-12-31', '2023-12-30');

            transactionDaoService.loadRelatedTransactions.mockResolvedValue([
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

            transactionDaoService.loadRelatedTransactions.mockResolvedValue([
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

            transactionDaoService.loadRelatedTransactions.mockResolvedValue([
                t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t3);

            expect(result).toBeUndefined();
        });

        it('should handle same-day sale and refund when refund comes first', async () => {
            const t1 = createTransaction('2023-01-01', '2023-12-31', '2023-01-01', 'New');
            const t2 = createTransaction('2023-01-01', '2023-12-31', '2023-01-01', 'Refund', );
            const t3 = createTransaction('2024-01-01', '2024-12-31', '2023-12-30');

            transactionDaoService.loadRelatedTransactions.mockResolvedValue([
                t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t3);

            expect(result).toBeUndefined();
        });

        it('should handle renewals after a partial refund of the end of the tranx', async () => {
            const t1 = createTransaction('2024-01-01', '2024-12-31', '2023-12-30', 'New');
            const t2 = createTransaction('2024-07-01', '2024-12-31', '2024-06-30', 'Refund');
            const t3 = createTransaction('2024-07-05', '2025-04-30', '2024-06-30');

            transactionDaoService.loadRelatedTransactions.mockResolvedValue([
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

            transactionDaoService.loadRelatedTransactions.mockResolvedValue([
                t3, t2, t1
            ]);

            const result = await service.findPreviousTransaction(t3);

            expect(result).toEqual({
                transaction: t1,
                effectiveMaintenanceEndDate: '2024-04-30'
            })
        });

    });
});

function createTransaction(startDate: string, endDate: string, saleDate: string, saleType: 'New'|'Refund' = 'New'): Transaction {
    const transaction = new Transaction();
    transaction.id = '' + uniqueTransactionId++;
    transaction.data = {
        purchaseDetails: {
            saleDate,
            saleType,
            maintenanceStartDate: startDate,
            maintenanceEndDate: endDate
        }
    } as any;
    return transaction;
}