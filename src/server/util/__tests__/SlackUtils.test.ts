import { buildSiteFilter } from '../SlackUtils.js';

describe('buildSiteFilter', () => {
    it('passes everything when the pattern is blank or undefined', () => {
        expect(buildSiteFilter(undefined)('anything.atlassian.net')).toBe(true);
        expect(buildSiteFilter('')('anything.atlassian.net')).toBe(true);
        expect(buildSiteFilter('   ')(undefined)).toBe(true);
    });

    it('only passes sites matching a positive pattern (case-insensitive)', () => {
        const filter = buildSiteFilter('^acme');
        expect(filter('acme.atlassian.net')).toBe(true);
        expect(filter('ACME-corp.atlassian.net')).toBe(true);
        expect(filter('other.atlassian.net')).toBe(false);
    });

    it('can exclude sites with a negative lookahead', () => {
        const filter = buildSiteFilter('^(?!bugbounty)');
        expect(filter('bugbounty-test-microck.atlassian.net')).toBe(false);
        expect(filter('real-customer.atlassian.net')).toBe(true);
    });

    it('tests a missing hostname as an empty string', () => {
        expect(buildSiteFilter('atlassian\\.net$')(undefined)).toBe(false);
        expect(buildSiteFilter('^(?!bugbounty)')(undefined)).toBe(true);
    });

    it('fails open and reports an invalid pattern', () => {
        const onInvalid = jest.fn();
        const filter = buildSiteFilter('(unclosed', onInvalid);
        expect(onInvalid).toHaveBeenCalledTimes(1);
        expect(filter('bugbounty.atlassian.net')).toBe(true);
    });
});
