type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject { [key: string]: JsonValue }
type JsonArray = JsonValue[];

export interface JsonDiffObject {
    [key: string]: JsonDelta;
}

export interface JsonDelta {
    changeType: 'added' | 'removed' | 'changed' | 'unchanged';
    oldValue?: JsonValue;
    newValue?: JsonValue;
    children?: JsonDiffObject;
}



const isPrimitive = (value: any): boolean => {
    return value === null ||
           typeof value === 'string' ||
           typeof value === 'number' ||
           typeof value === 'boolean';
};

const isArray = (value: any): value is JsonArray => {
    return Array.isArray(value);
};

const isObject = (value: any): value is JsonObject => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const areArraysEqual = (arr1: JsonArray, arr2: JsonArray): boolean => {
    if (arr1.length !== arr2.length) return false;

    for (let i = 0; i < arr1.length; i++) {
        const item1 = arr1[i];
        const item2 = arr2[i];

        if (isArray(item1) && isArray(item2)) {
            if (!areArraysEqual(item1, item2)) return false;
        } else if (isObject(item1) && isObject(item2)) {
            const diff = compareObjects(item1, item2);
            if (diff.changeType !== 'unchanged') return false;
        } else if (item1 !== item2) {
            return false;
        }
    }

    return true;
};

const compareObjects = (oldObj: JsonValue, newObj: JsonValue): JsonDelta => {
    // Handle primitive values
    if (isPrimitive(oldObj) || isPrimitive(newObj)) {
        if (oldObj === newObj) {
            return {
                changeType: 'unchanged',
                oldValue: oldObj,
                newValue: newObj
            };
        }
        return {
            changeType: 'changed',
            oldValue: oldObj,
            newValue: newObj
        };
    }

    // Handle arrays
    if (isArray(oldObj) && isArray(newObj)) {
        if (areArraysEqual(oldObj, newObj)) {
            return {
                changeType: 'unchanged',
                oldValue: oldObj,
                newValue: newObj
            };
        }
        return {
            changeType: 'changed',
            oldValue: oldObj,
            newValue: newObj
        };
    }

    // Handle objects
    if (isObject(oldObj) && isObject(newObj)) {
        const oldKeys = Object.keys(oldObj);
        const newKeys = Object.keys(newObj);
        const allKeys = new Set([...oldKeys, ...newKeys]);
        const children: { [key: string]: JsonDelta } = {};

        for (const key of allKeys) {
            const oldValue = oldObj[key];
            const newValue = newObj[key];

            if (!(key in oldObj)) {
                children[key] = {
                    changeType: 'added',
                    newValue: newValue
                };
            } else if (!(key in newObj)) {
                children[key] = {
                    changeType: 'removed',
                    oldValue: oldValue
                };
            } else {
                children[key] = compareObjects(oldValue, newValue);
            }
        }

        return {
            changeType: 'unchanged',
            children
        };
    }

    // Handle case where types don't match
    return {
        changeType: 'changed',
        oldValue: oldObj,
        newValue: newObj
    };
};

export const getObjectDiff = (oldObj: JsonObject | undefined, newObj: JsonObject): JsonDiffObject => {
    const diff = compareObjects(oldObj || {}, newObj);
    return diff.children || {};
};