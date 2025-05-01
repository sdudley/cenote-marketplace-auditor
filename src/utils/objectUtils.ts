export function deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;

    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
        return false;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!deepEqual(obj1[key], obj2[key])) return false;
    }

    return true;
}

export function normalizeObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(normalizeObject);
    }

    const sortedObj: any = {};
    Object.keys(obj)
        .sort()
        .forEach(key => {
            sortedObj[key] = normalizeObject(obj[key]);
        });

    return sortedObj;
}

export function computeJsonPaths(obj1: any, obj2: any, path: string = ''): string[] {
    if (obj1 === obj2) {
        return [];
    }

    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
        return [path];
    }

    const paths: string[] = [];
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key;

        if (!(key in obj1) || !(key in obj2)) {
            paths.push(newPath);
        } else if (obj1[key] !== obj2[key]) {
            if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object' && obj1[key] !== null && obj2[key] !== null) {
                paths.push(...computeJsonPaths(obj1[key], obj2[key], newPath));
            } else {
                paths.push(newPath);
            }
        }
    }

    return paths;
}