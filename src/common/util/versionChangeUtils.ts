/**
 * Helpers for turning a version's stored diff string (changed JSON paths joined with " | ", as produced by
 * computeJsonPaths) into per-field "old → new" changes, using the data of the version and its predecessor.
 */

/** Shown when the field did not exist in the prior version. */
export const VALUE_NONE = '(none)';
/** Shown when the field no longer exists in this version. */
export const VALUE_REMOVED = '(removed)';
/** Shown when the prior version is not available, so the old value is unknown. */
export const VALUE_UNKNOWN = '?';

export const DEFAULT_MAX_VALUE_LENGTH = 20;

export interface VersionFieldChange {
    path: string;
    oldValue: string;
    newValue: string;
}

const ABSENT = Symbol('absent');
type Lookup = unknown | typeof ABSENT;

const isContainer = (value: unknown): value is Record<string, unknown> | unknown[] =>
    typeof value === 'object' && value !== null;

const isEmptyContainer = (value: unknown): boolean =>
    isContainer(value) && Object.keys(value).length === 0;

const getAtPath = (root: unknown, segments: string[]): Lookup => {
    let current: unknown = root;
    for (const segment of segments) {
        if (!isContainer(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
            return ABSENT;
        }
        current = (current as Record<string, unknown>)[segment];
    }
    return current;
};

/** Relative paths of all leaves under a value. Primitives and empty objects/arrays are leaves. */
const collectLeafPaths = (value: unknown, prefix: string[] = []): string[][] => {
    if (!isContainer(value) || isEmptyContainer(value)) {
        return [prefix];
    }
    return Object.keys(value).flatMap(key =>
        collectLeafPaths((value as Record<string, unknown>)[key], [...prefix, key])
    );
};

export const formatChangeValue = (value: unknown): string => {
    if (value === null) return 'null';
    if (typeof value === 'string') return value === '' ? '""' : value;
    if (Array.isArray(value) && value.length === 0) return '[]';
    if (isContainer(value)) return isEmptyContainer(value) ? '{}' : JSON.stringify(value);
    return String(value);
};

/** Truncates a value to maxLength characters, adding an ellipsis when shortened. */
export const truncateChangeValue = (value: string, maxLength: number = DEFAULT_MAX_VALUE_LENGTH): string =>
    value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;

const describeLookup = (lookup: Lookup, absentLabel: string): string =>
    lookup === ABSENT ? absentLabel : formatChangeValue(lookup);

/**
 * Builds one entry per changed field. When a changed path points at an object or array (e.g. a whole
 * sub-object was added or removed), it is expanded so that each leaf field gets its own entry.
 *
 * @param diff        The stored diff string (paths joined with " | "), or null/undefined for no changes.
 * @param priorData   Data of the previous version, or undefined if it is not available.
 * @param currentData Data of this version.
 */
export function buildVersionFieldChanges(
    diff: string | null | undefined,
    priorData: unknown,
    currentData: unknown
): VersionFieldChange[] {
    if (!diff?.trim()) {
        return [];
    }

    const priorKnown = priorData !== undefined;
    const changes: VersionFieldChange[] = [];

    for (const path of diff.split(' | ').map(p => p.trim()).filter(Boolean)) {
        const segments = path.split('.');
        const oldLookup = priorKnown ? getAtPath(priorData, segments) : ABSENT;
        const newLookup = getAtPath(currentData, segments);

        const needsExpansion =
            (isContainer(oldLookup) && !isEmptyContainer(oldLookup)) ||
            (isContainer(newLookup) && !isEmptyContainer(newLookup));

        if (!needsExpansion) {
            changes.push({
                path,
                oldValue: priorKnown ? describeLookup(oldLookup, VALUE_NONE) : VALUE_UNKNOWN,
                newValue: describeLookup(newLookup, VALUE_REMOVED)
            });
            continue;
        }

        // Union of leaf paths from both sides, in the new version's order first
        const leafKeys = new Map<string, string[]>();
        for (const side of [newLookup, oldLookup]) {
            if (isContainer(side) && !isEmptyContainer(side)) {
                for (const leaf of collectLeafPaths(side)) {
                    leafKeys.set(leaf.join('.'), leaf);
                }
            }
        }

        for (const leaf of leafKeys.values()) {
            const oldLeaf = isContainer(oldLookup) ? getAtPath(oldLookup, leaf) : ABSENT;
            const newLeaf = isContainer(newLookup) ? getAtPath(newLookup, leaf) : ABSENT;
            const oldValue = priorKnown ? describeLookup(oldLeaf, VALUE_NONE) : VALUE_UNKNOWN;
            const newValue = describeLookup(newLeaf, VALUE_REMOVED);

            // Unchanged leaves inside a changed container are noise
            if (priorKnown && oldValue === newValue) {
                continue;
            }

            changes.push({ path: [path, ...leaf].join('.'), oldValue, newValue });
        }
    }

    return changes;
}
