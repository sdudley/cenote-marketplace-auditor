import { buildLicenseVersionsFromHistory } from '../licenseVersionUtils';
import { LicenseHistorySnapshot } from '../licenseVersionUtils';

describe('buildLicenseVersionsFromHistory', () => {
    const baseSnapshot = {
        addonLicenseId: '12345',
        licenseId: 'SEN-12345',
        addonKey: 'com.example.app',
        productId: 'product-id',
        addonName: 'Example App',
        hosting: 'Cloud',
        lastUpdated: '2025-01-01',
        licenseType: 'COMMERCIAL',
        maintenanceStartDate: '2024-12-01',
        maintenanceEndDate: '2025-02-01',
        status: 'active',
        tier: '10 Users',
        contactDetails: {
            company: 'Example Co',
            country: 'US',
            region: 'AMER',
            technicalContact: {
                email: 'tech@example.com',
                name: 'Tech',
                address1: '123 Main',
                city: 'City',
                postcode: '12345',
                phone: '555-0100'
            },
            billingContact: {
                email: 'billing@example.com',
                name: 'Billing',
                address1: '123 Main',
                city: 'City',
                postcode: '12345',
                phone: '555-0100'
            }
        }
    } satisfies LicenseHistorySnapshot;

    it('builds versions sorted newest-first with diffs between consecutive snapshots', () => {
        const snapshots: LicenseHistorySnapshot[] = [
            {
                ...baseSnapshot,
                recordCreatedDate: '2025-01-01T10:00:00.000Z',
                tier: '10 Users'
            },
            {
                ...baseSnapshot,
                recordCreatedDate: '2025-01-15T10:00:00.000Z',
                tier: '25 Users'
            },
            {
                ...baseSnapshot,
                recordCreatedDate: '2025-02-01T10:00:00.000Z',
                tier: '25 Users',
                status: 'inactive'
            }
        ];

        const versions = buildLicenseVersionsFromHistory(snapshots, 'SEN-12345');

        expect(versions).toHaveLength(3);
        expect(versions.map(v => v.version)).toEqual([3, 2, 1]);
        expect(versions[2].diff).toBeUndefined();
        expect(versions[1].diff).toBe('tier');
        expect(versions[0].diff).toBe('status');
        expect(versions.every(v => v.data.recordCreatedDate)).toBe(false);
    });

    it('uses lastUpdated when recordCreatedDate is missing', () => {
        const snapshots: LicenseHistorySnapshot[] = [
            { ...baseSnapshot, lastUpdated: '2025-01-01', tier: '10 Users' },
            { ...baseSnapshot, lastUpdated: '2025-02-01', tier: '25 Users' }
        ];

        const versions = buildLicenseVersionsFromHistory(snapshots, 'SEN-12345');

        expect(versions).toHaveLength(2);
        expect(versions[0].version).toBe(2);
        expect(versions[0].createdAt).toBe('2025-02-01');
    });
});
