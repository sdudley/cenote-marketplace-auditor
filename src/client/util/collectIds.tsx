import { JsonDiffObject } from '#common/util/objectDiff';

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue }
export type JsonArray = JsonValue[];

// Collect all node IDs
export const collectIds = (obj: JsonValue, nodeId: string = ''): string[] => {
    if (!obj || typeof obj !== 'object') return [nodeId];
    return [nodeId, ...Object.entries(obj as JsonObject).flatMap(([key, value]) =>
        collectIds(value, nodeId ? `${nodeId}.${key}` : key)
    )];
};

export const collectIdsForDiffObject = (obj: JsonDiffObject): string[] => {
    const ids: string[] = [];

    const processDiffObject = (diffObj: JsonDiffObject, parentKey: string = '') => {
        Object.entries(diffObj).forEach(([key, delta]) => {
            const fullKey = parentKey ? `${parentKey}.${key}` : key;
            ids.push(fullKey);

            if (delta.children) {
                processDiffObject(delta.children, fullKey);
            }

            if (delta.arrayElements) {
                delta.arrayElements.forEach((arrayDelta, index) => {
                    const arrayKey = `${fullKey}.${index}`;
                    ids.push(arrayKey);

                    if (arrayDelta.children) {
                        processDiffObject(arrayDelta.children, arrayKey);
                    }
                });
            }
        });
    };

    processDiffObject(obj);
    return ids;
};