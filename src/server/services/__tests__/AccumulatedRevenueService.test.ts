import { AccumulatedRevenueService } from '../AccumulatedRevenueService.js';
import { TransactionDao } from '#server/database/dao/TransactionDao.js';

describe('AccumulatedRevenueService', () => {
    let getRevenueBySaleDate: jest.Mock;
    let service: AccumulatedRevenueService;

    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00Z'));

        getRevenueBySaleDate = jest.fn().mockResolvedValue([
            { saleDate: '2026-01-10', revenue: 600_000 },
            { saleDate: '2026-02-10', revenue: 500_000 },
            { saleDate: '2026-02-20', revenue: -50_000 }
        ]);

        service = new AccumulatedRevenueService({ getRevenueBySaleDate } as unknown as TransactionDao);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('accumulates revenue strictly before the given date', async () => {
        expect(await service.getAccumulatedRevenueBefore('2026-01-10')).toBe(0);
        expect(await service.getAccumulatedRevenueBefore('2026-02-10')).toBe(600_000);
        expect(await service.getAccumulatedRevenueBefore('2026-02-21')).toBe(1_050_000);
    });

    it('crosses the $1M threshold at the right sale', async () => {
        expect(await service.getAccumulatedRevenueBefore('2026-02-10')).toBeLessThan(1_000_000);
        expect(await service.getAccumulatedRevenueBefore('2026-02-11')).toBeGreaterThanOrEqual(1_000_000);
    });

    it('loads once and shares the in-flight query between concurrent callers', async () => {
        await Promise.all([
            service.getAccumulatedRevenueBefore('2026-02-01'),
            service.getAccumulatedRevenueBefore('2026-03-01'),
            service.getAccumulatedRevenueBefore('2026-04-01')
        ]);
        await service.getAccumulatedRevenueBefore('2026-05-01');

        expect(getRevenueBySaleDate).toHaveBeenCalledTimes(1);
    });

    it('reloads after the cache expires', async () => {
        await service.getAccumulatedRevenueBefore('2026-03-01');
        jest.setSystemTime(new Date('2026-06-01T00:02:00Z'));
        await service.getAccumulatedRevenueBefore('2026-03-01');

        expect(getRevenueBySaleDate).toHaveBeenCalledTimes(2);
    });

    it('reloads after invalidate()', async () => {
        await service.getAccumulatedRevenueBefore('2026-03-01');
        service.invalidate();
        await service.getAccumulatedRevenueBefore('2026-03-01');

        expect(getRevenueBySaleDate).toHaveBeenCalledTimes(2);
    });

    it('does not cache a failed load', async () => {
        getRevenueBySaleDate.mockRejectedValueOnce(new Error('db down'));

        await expect(service.getAccumulatedRevenueBefore('2026-03-01')).rejects.toThrow('db down');
        expect(await service.getAccumulatedRevenueBefore('2026-03-01')).toBe(1_050_000);
    });
});
