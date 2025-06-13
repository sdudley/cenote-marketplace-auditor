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