/**
 * Checks if all paths in changedPaths contain at least one of the fieldsToIgnore as a substring.
 * @param changedPaths Array of paths to check
 * @param fieldsToIgnore Array of fields to ignore, or null
 * @returns true if all paths contain at least one ignored field, false otherwise
 */
export function isProperSubsetOfFields(changedPaths: string[], fieldsToIgnore: string[]|null): boolean {
    if (changedPaths.length === 0) {
        return false;
    }

    return changedPaths.every(path => fieldsToIgnore?.some(field => path.includes(field)));
}