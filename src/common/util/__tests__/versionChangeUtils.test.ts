import { computeJsonPaths } from '../objectUtils.js';
import {
    buildVersionFieldChanges,
    formatChangeValue,
    truncateChangeValue,
    VALUE_NONE,
    VALUE_REMOVED,
    VALUE_UNKNOWN
} from '../versionChangeUtils.js';

/** Builds the diff string the same way the jobs do. */
const diffOf = (prior: unknown, current: unknown) => computeJsonPaths(prior, current).join(' | ');

describe('buildVersionFieldChanges', () => {
    it('returns no changes for an empty or missing diff', () => {
        expect(buildVersionFieldChanges(undefined, {}, {})).toEqual([]);
        expect(buildVersionFieldChanges(null, {}, {})).toEqual([]);
        expect(buildVersionFieldChanges('  ', {}, {})).toEqual([]);
    });

    it('shows old and new values for changed, removed, and added fields', () => {
        const prior = {
            status: 'inactive',
            purchaseDetails: { maintenanceEndDate: '2026-11-01', vendorAmount: 100 }
        };
        const current = {
            status: 'active',
            purchaseDetails: { maintenanceStartDate: '2026-11-17', vendorAmount: 120.5 }
        };

        expect(buildVersionFieldChanges(diffOf(prior, current), prior, current)).toEqual([
            { path: 'status', oldValue: 'inactive', newValue: 'active' },
            { path: 'purchaseDetails.maintenanceEndDate', oldValue: '2026-11-01', newValue: VALUE_REMOVED },
            { path: 'purchaseDetails.vendorAmount', oldValue: '100', newValue: '120.5' },
            { path: 'purchaseDetails.maintenanceStartDate', oldValue: VALUE_NONE, newValue: '2026-11-17' }
        ]);
    });

    it('expands an added object into one entry per leaf field', () => {
        const prior = { purchaseDetails: {} as Record<string, unknown> };
        const current = {
            purchaseDetails: {
                partnerDetails: { partnerName: 'Acme', billingContact: { email: 'a@example.com' } }
            }
        };

        expect(buildVersionFieldChanges(diffOf(prior, current), prior, current)).toEqual([
            { path: 'purchaseDetails.partnerDetails.partnerName', oldValue: VALUE_NONE, newValue: 'Acme' },
            { path: 'purchaseDetails.partnerDetails.billingContact.email', oldValue: VALUE_NONE, newValue: 'a@example.com' }
        ]);
    });

    it('expands a removed array into one entry per element field', () => {
        const prior = { discounts: [{ type: 'EXPERT', amount: 10 }] };
        const current = {};

        expect(buildVersionFieldChanges(diffOf(prior, current), prior, current)).toEqual([
            { path: 'discounts.0.type', oldValue: 'EXPERT', newValue: VALUE_REMOVED },
            { path: 'discounts.0.amount', oldValue: '10', newValue: VALUE_REMOVED }
        ]);
    });

    it('expands an object that replaced null', () => {
        const prior = { partner: null };
        const current = { partner: { name: 'Acme' } };

        expect(buildVersionFieldChanges(diffOf(prior, current), prior, current)).toEqual([
            { path: 'partner.name', oldValue: VALUE_NONE, newValue: 'Acme' }
        ]);
    });

    it('treats empty objects and arrays as single values', () => {
        const prior = { tags: ['a'], meta: {} };
        const current = { tags: [], meta: { x: 1 } };

        expect(buildVersionFieldChanges('tags | meta', prior, current)).toEqual([
            { path: 'tags.0', oldValue: 'a', newValue: VALUE_REMOVED },
            { path: 'meta.x', oldValue: VALUE_NONE, newValue: '1' }
        ]);
        expect(buildVersionFieldChanges('tags', { tags: null }, { tags: [] })).toEqual([
            { path: 'tags', oldValue: 'null', newValue: '[]' }
        ]);
    });

    it('marks old values as unknown when the prior version is unavailable', () => {
        const current = { status: 'active', details: { a: 1 } };

        expect(buildVersionFieldChanges('status | details', undefined, current)).toEqual([
            { path: 'status', oldValue: VALUE_UNKNOWN, newValue: 'active' },
            { path: 'details.a', oldValue: VALUE_UNKNOWN, newValue: '1' }
        ]);
    });

    it('formats booleans, null, and empty strings readably', () => {
        const prior = { a: true, b: 'x', c: 'y' };
        const current = { a: false, b: null, c: '' };

        expect(buildVersionFieldChanges(diffOf(prior, current), prior, current)).toEqual([
            { path: 'a', oldValue: 'true', newValue: 'false' },
            { path: 'b', oldValue: 'x', newValue: 'null' },
            { path: 'c', oldValue: 'y', newValue: '""' }
        ]);
    });
});

describe('formatChangeValue', () => {
    it('stringifies non-empty containers as JSON', () => {
        expect(formatChangeValue({ a: 1 })).toBe('{"a":1}');
        expect(formatChangeValue([1, 2])).toBe('[1,2]');
    });
});

describe('truncateChangeValue', () => {
    it('leaves values of 20 characters or fewer unchanged', () => {
        expect(truncateChangeValue('12345678901234567890')).toBe('12345678901234567890');
    });

    it('truncates longer values with an ellipsis', () => {
        expect(truncateChangeValue('123456789012345678901')).toBe('12345678901234567890…');
    });

    it('supports a custom maximum length', () => {
        expect(truncateChangeValue('abcdef', 3)).toBe('abc…');
    });
});
