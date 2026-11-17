/**
 * Encodes special characters in Slack message text.
 * Only encodes &, <, and > as required by Slack's API.
 * @param text The text to encode
 * @returns The encoded text
 */
export function encodeSlackText(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Builds a predicate that decides whether a site (e.g. a cloud site hostname) passes a
 * user-configured regular expression filter.
 *
 * - A blank/undefined pattern means "no filter": every site passes.
 * - Matching is case-insensitive and unanchored (use ^ and $ to anchor), since hostnames
 *   are case-insensitive. A site with no hostname is tested as an empty string.
 * - An invalid pattern fails open (every site passes) so that a typo in the configuration
 *   never silently suppresses notifications. The error is reported via onInvalid.
 */
export function buildSiteFilter(
    pattern: string | undefined,
    onInvalid?: (error: unknown) => void
): (site: string | undefined) => boolean {
    const trimmed = pattern?.trim();
    if (!trimmed) {
        return () => true;
    }

    try {
        const regex = new RegExp(trimmed, 'i');
        return (site) => regex.test(site ?? '');
    } catch (error) {
        onInvalid?.(error);
        return () => true;
    }
}
