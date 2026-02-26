import { Transaction } from '#common/entities/Transaction';
import { hasProratedDetails, isMQBTransaction, findParentForMQBTransaction } from '../mqbUtils';

describe('mqbUtils', () => {
    describe('hasProratedDetails', () => {
        it('returns false for undefined or null', () => {
            expect(hasProratedDetails(undefined)).toBe(false);
            expect(hasProratedDetails(null)).toBe(false);
        });

        it('returns false for empty array', () => {
            expect(hasProratedDetails([])).toBe(false);
        });

        it('returns true for non-empty array', () => {
            expect(hasProratedDetails([{ date: '2026-01-01', addedUsers: 1 }])).toBe(true);
        });
    });

    describe('isMQBTransaction', () => {
        it('returns false when proratedDetails is missing', () => {
            const t = new Transaction();
            t.id = '1';
            t.data = {
                purchaseDetails: {
                    saleDate: '2026-01-01',
                    maintenanceStartDate: '2026-01-01',
                    maintenanceEndDate: '2026-02-01',
                    tier: '10 Users'
                }
            } as any;
            expect(isMQBTransaction(t)).toBe(false);
        });

        it('returns false when proratedDetails is empty array', () => {
            const t = new Transaction();
            t.id = '1';
            t.data = {
                purchaseDetails: {
                    saleDate: '2026-01-01',
                    maintenanceStartDate: '2026-01-01',
                    maintenanceEndDate: '2026-02-01',
                    tier: '10 Users',
                    proratedDetails: []
                }
            } as any;
            expect(isMQBTransaction(t)).toBe(false);
        });

        it('returns true when proratedDetails has entries', () => {
            const t = new Transaction();
            t.id = '1';
            t.data = {
                purchaseDetails: {
                    saleDate: '2026-01-01',
                    maintenanceStartDate: '2026-01-01',
                    maintenanceEndDate: '2026-02-01',
                    tier: 'Per Unit Pricing (5 Users)',
                    proratedDetails: [{ date: '2026-01-15T12:00:00.000Z', addedUsers: 5 }]
                }
            } as any;
            expect(isMQBTransaction(t)).toBe(true);
        });
    });

    describe('findParentForMQBTransaction', () => {
        it('returns undefined when transaction is not MQB', () => {
            const t = new Transaction();
            t.id = '1';
            t.data = {
                purchaseDetails: {
                    maintenanceEndDate: '2026-02-01',
                    proratedDetails: undefined
                }
            } as any;
            expect(findParentForMQBTransaction(t, [])).toBeUndefined();
        });

        it('returns the parent (non-MQB) transaction with same maintenanceEndDate', () => {
            const prorated = new Transaction();
            prorated.id = 'mqb-1';
            prorated.data = {
                purchaseDetails: {
                    maintenanceStartDate: '2026-01-14',
                    maintenanceEndDate: '2026-01-15',
                    proratedDetails: [{ date: '2025-12-15T12:00:00.000Z', addedUsers: 3 }]
                }
            } as any;

            const main = new Transaction();
            main.id = 'main-1';
            main.data = {
                purchaseDetails: {
                    maintenanceStartDate: '2025-12-15',
                    maintenanceEndDate: '2026-01-15',
                    proratedDetails: undefined
                }
            } as any;

            const other = new Transaction();
            other.id = 'other';
            other.data = {
                purchaseDetails: {
                    maintenanceEndDate: '2025-12-15',
                    proratedDetails: undefined
                }
            } as any;

            const result = findParentForMQBTransaction(prorated, [main, other]);
            expect(result?.id).toBe('main-1');
        });

        it('does not return a MQB transaction as the parent', () => {
            const prorated1 = new Transaction();
            prorated1.id = 'mqb-1';
            prorated1.data = {
                purchaseDetails: {
                    maintenanceEndDate: '2026-01-15',
                    proratedDetails: [{ date: '2026-01-10T12:00:00.000Z', addedUsers: 1 }]
                }
            } as any;

            const prorated2 = new Transaction();
            prorated2.id = 'mqb-2';
            prorated2.data = {
                purchaseDetails: {
                    maintenanceEndDate: '2026-01-15',
                    proratedDetails: [{ date: '2026-01-12T12:00:00.000Z', addedUsers: 2 }]
                }
            } as any;

            const result = findParentForMQBTransaction(prorated1, [prorated2]);
            expect(result).toBeUndefined();
        });
    });
});
