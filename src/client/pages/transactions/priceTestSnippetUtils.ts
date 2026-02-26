import { PriceTestSnippetResponse } from '#common/types/transactionPricing';
import { PricingTierResult } from '#common/types/pricingTierResult';

/** Stable JSON stringify (sorted keys) for hashing. */
function stableStringify(obj: unknown): string {
    if (obj === null) return 'null';
    if (typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
    const keys = Object.keys(obj).sort();
    const pairs = keys.map(k => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k]));
    return '{' + pairs.join(',') + '}';
}

/** Simple djb2-style string hash, returns short hex (8 chars). */
export function shortHash(str: string): string {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) + str.charCodeAt(i);
    }
    const hex = Math.abs(h).toString(16);
    return hex.slice(0, 8);
}

export function pricingTierResultHash(pricingTierResult: PricingTierResult): string {
    return shortHash(stableStringify(pricingTierResult));
}

function jsEscape(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function formatValue(v: unknown): string {
    if (v === undefined) return '';
    if (v === null) return 'undefined';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string') return '"' + jsEscape(v) + '"';
    if (Array.isArray(v)) {
        if (v.length === 0) return '[]';
        return '[' + v.map(formatValue).join(', ') + ']';
    }
    if (typeof v === 'object' && v !== null) {
        const entries = Object.entries(v as Record<string, unknown>).filter((entry) => entry[1] !== undefined);
        if (entries.length === 0) return '{}';
        const parts = entries.map(([k, val]) => k + ': ' + formatValue(val));
        return '{ ' + parts.join(', ') + ' }';
    }
    return String(v);
}

/** Build the test code string: calculateExpectedPrice opts + expect toBeCloseTo. */
function buildTestCode(opts: Record<string, unknown>, constantName: string, purchasePrice: number, vendorAmount: number, testName: string): string {
    const optsCopy = { ...opts };
    optsCopy.pricingTierResult = constantName;
    const lines: string[] = [];
    const keys = Object.keys(optsCopy).filter(k => optsCopy[k] !== undefined && optsCopy[k] !== null);
    for (const key of keys) {
        const v = optsCopy[key];
        if (key === 'pricingTierResult') {
            lines.push(`            ${key}: ${constantName},`);
        } else {
            let valueToFormat = v;
            if (key === 'previousPricing' && typeof v === 'object' && v !== null) {
                valueToFormat = { ...v as object, descriptors: [] };
            }
            const formatted = formatValue(valueToFormat);
            if (formatted) lines.push(`            ${key}: ${formatted},`);
        }
    }
    const optsBlock = lines.join('\n').replace(/,\s*$/, '');
    return `    it('${testName.replace(/'/g, "\\'")}', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
${optsBlock}
        }));

        expect(result.purchasePrice).toBeCloseTo(${purchasePrice}, 2);
        expect(result.vendorPrice).toBeCloseTo(${vendorAmount}, 2);
    });`;
}

/** Build the pricing table export (constant declaration for pricingTable.ts). */
function buildPricingTableExport(pricingTierResult: PricingTierResult, constantName: string): string {
    const tiersStr = pricingTierResult.tiers.map(t => `    { userTier: ${t.userTier}, cost: ${t.cost} }`).join(',\n');
    const priorTiers = pricingTierResult.priorTiers;
    const priorTiersStr = priorTiers == null
        ? 'undefined'
        : '[\n' + priorTiers.map(t => `    { userTier: ${t.userTier}, cost: ${t.cost} }`).join(',\n') + '\n]';
    const priorEnd = pricingTierResult.priorPricingEndDate == null ? 'undefined' : `'${pricingTierResult.priorPricingEndDate}'`;
    return `export const ${constantName}: PricingTierResult = {
    tiers: [
${tiersStr}
    ],
    priorTiers: ${priorTiersStr},
    priorPricingEndDate: ${priorEnd}
};`;
}

export interface PriceTestSnippetStrings {
    testCode: string;
    pricingTableExport: string;
    constantName: string;
}

export function buildPriceTestSnippetStrings(
    response: PriceTestSnippetResponse,
    testNameSuggest: string
): PriceTestSnippetStrings {
    const hash = pricingTierResultHash(response.pricingTierResult);
    const constantName = `pricingTierResult_${hash}`;
    const opts = response.pricingOpts as unknown as Record<string, unknown>;
    const testName = testNameSuggest || `live: ${opts.saleDate} ${opts.saleType} ${opts.tier}`;
    const testCode = buildTestCode(opts, constantName, response.purchasePrice, response.vendorAmount, testName);
    const pricingTableExport = buildPricingTableExport(response.pricingTierResult, constantName);
    return { testCode, pricingTableExport, constantName };
}
