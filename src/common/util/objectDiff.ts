/**
 * Set of functions used to calculate a diff between two objects. The output is a
 * JsonDelta, which is suitable for programmatic display.
 */

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
    arrayElements?: JsonDelta[];
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

const compareArrays = (oldArr: JsonArray, newArr: JsonArray): JsonDelta => {
    const maxLength = Math.max(oldArr.length, newArr.length);
    const arrayElements: JsonDelta[] = [];

    for (let i = 0; i < maxLength; i++) {
        const oldItem = oldArr[i];
        const newItem = newArr[i];

        if (i >= oldArr.length) {
            // New item added
            if (isObject(newItem)) {
                arrayElements.push(processNewObject(newItem));
            } else {
                arrayElements.push({
                    changeType: 'added',
                    newValue: newItem
                });
            }
        } else if (i >= newArr.length) {
            // Item removed
            if (isObject(oldItem)) {
                arrayElements.push(processRemovedObject(oldItem));
            } else {
                arrayElements.push({
                    changeType: 'removed',
                    oldValue: oldItem
                });
            }
        } else {
            // Item exists in both arrays
            arrayElements.push(compareObjects(oldItem, newItem));
        }
    }

    // Revert: always mark parent array as 'unchanged' if structure is the same
    return {
        changeType: 'unchanged',
        arrayElements
    };
};

const processRemovedObject = (obj: JsonObject): JsonDelta => {
    const children: { [key: string]: JsonDelta } = {};

    // Sort keys alphabetically
    const sortedKeys = Object.keys(obj).sort();

    sortedKeys.forEach((key) => {
        const value = obj[key];
        if (isArray(value)) {
            // Handle arrays by creating arrayElements
            const arrayElements: JsonDelta[] = value.map((item) => {
                if (isObject(item)) {
                    return processRemovedObject(item);
                } else {
                    return {
                        changeType: 'removed',
                        oldValue: item
                    };
                }
            });
            children[key] = {
                changeType: 'removed',
                arrayElements
            };
        } else if (isObject(value)) {
            children[key] = processRemovedObject(value);
        } else {
            children[key] = {
                changeType: 'removed',
                oldValue: value
            };
        }
    });

    return {
        changeType: 'removed',
        children
    };
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
        return compareArrays(oldObj, newObj);
    }

    // Handle objects
    if (isObject(oldObj) && isObject(newObj)) {
        const oldKeys = Object.keys(oldObj);
        const newKeys = Object.keys(newObj);
        const allKeys = new Set([...oldKeys, ...newKeys]);
        const children: { [key: string]: JsonDelta } = {};

        // Sort keys alphabetically
        const sortedKeys = Array.from(allKeys).sort();

        for (const key of sortedKeys) {
            const oldValue = oldObj[key];
            const newValue = newObj[key];

            if (!(key in oldObj)) {
                if (isArray(newValue)) {
                    // Handle new arrays by creating arrayElements
                    const arrayElements: JsonDelta[] = newValue.map((item) => {
                        if (isObject(item)) {
                            return processNewObject(item);
                        } else {
                            return {
                                changeType: 'added',
                                newValue: item
                            };
                        }
                    });
                    children[key] = {
                        changeType: 'added',
                        arrayElements
                    };
                } else if (isObject(newValue)) {
                    children[key] = processNewObject(newValue);
                } else {
                    children[key] = {
                        changeType: 'added',
                        newValue: newValue
                    };
                }
            } else if (!(key in newObj)) {
                if (isArray(oldValue)) {
                    // Handle removed arrays by creating arrayElements
                    const arrayElements: JsonDelta[] = oldValue.map((item) => {
                        if (isObject(item)) {
                            return processRemovedObject(item);
                        } else {
                            return {
                                changeType: 'removed',
                                oldValue: item
                            };
                        }
                    });
                    children[key] = {
                        changeType: 'removed',
                        arrayElements
                    };
                } else if (isObject(oldValue)) {
                    children[key] = processRemovedObject(oldValue);
                } else {
                    children[key] = {
                        changeType: 'removed',
                        oldValue: oldValue
                    };
                }
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

const processNewObject = (obj: JsonObject): JsonDelta => {
    const children: { [key: string]: JsonDelta } = {};

    // Sort keys alphabetically
    const sortedKeys = Object.keys(obj).sort();

    sortedKeys.forEach((key) => {
        const value = obj[key];
        if (isArray(value)) {
            // Handle arrays by creating arrayElements
            const arrayElements: JsonDelta[] = value.map((item) => {
                if (isObject(item)) {
                    return processNewObject(item);
                } else {
                    return {
                        changeType: 'added',
                        newValue: item
                    };
                }
            });
            children[key] = {
                changeType: 'added',
                arrayElements
            };
        } else if (isObject(value)) {
            children[key] = processNewObject(value);
        } else {
            children[key] = {
                changeType: 'added',
                newValue: value
            };
        }
    });

    return {
        changeType: 'added',
        children
    };
};

export const getObjectDiff = (oldObj: JsonObject | undefined, newObj: JsonObject): JsonDiffObject => {
    if (!oldObj) {
        return processNewObject(newObj).children || {};
    }
    const diff = compareObjects(oldObj, newObj);
    return diff.children || {};
};