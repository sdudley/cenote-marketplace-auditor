import { computeJsonPaths } from '../objectUtils';

describe('computeJsonPaths', () => {
    test('should return empty array for identical objects', () => {
        const obj1 = { a: 1, b: { c: 2 } };
        const obj2 = { a: 1, b: { c: 2 } };
        expect(computeJsonPaths(obj1, obj2)).toEqual([]);
    });

    test('should handle primitive value differences', () => {
        const obj1 = { a: 1, b: 2 };
        const obj2 = { a: 1, b: 3 };
        expect(computeJsonPaths(obj1, obj2)).toEqual(['b']);
    });

    test('should handle nested object differences', () => {
        const obj1 = { a: { b: { c: 1 } } };
        const obj2 = { a: { b: { c: 2 } } };
        expect(computeJsonPaths(obj1, obj2)).toEqual(['a.b.c']);
    });

    test('should handle missing keys', () => {
        const obj1 = { a: 1, b: 2 };
        const obj2 = { a: 1 };
        expect(computeJsonPaths(obj1, obj2)).toEqual(['b']);
    });

    test('should handle extra keys', () => {
        const obj1 = { a: 1 };
        const obj2 = { a: 1, b: 2 };
        expect(computeJsonPaths(obj1, obj2)).toEqual(['b']);
    });

    test('should handle array differences', () => {
        const obj1 = { a: [1, 2, 3] };
        const obj2 = { a: [1, 4, 3] };
        expect(computeJsonPaths(obj1, obj2)).toEqual(['a.1']);
    });

    test('should handle mixed types', () => {
        const obj1 = { a: 1, b: { c: 2 }, d: [1, 2] };
        const obj2 = { a: 2, b: { c: 3 }, d: [1, 3] };
        expect(computeJsonPaths(obj1, obj2)).toEqual(['a', 'b.c', 'd.1']);
    });

    test('should handle null values', () => {
        const obj1 = { a: null, b: { c: 1 } };
        const obj2 = { a: 1, b: { c: 1 } };
        expect(computeJsonPaths(obj1, obj2)).toEqual(['a']);
    });

    test('should handle undefined values', () => {
        const obj1 = { a: undefined, b: { c: 1 } };
        const obj2 = { a: 1, b: { c: 1 } };
        expect(computeJsonPaths(obj1, obj2)).toEqual(['a']);
    });

    test('should handle empty objects', () => {
        const obj1 = {};
        const obj2 = { a: 1 };
        expect(computeJsonPaths(obj1, obj2)).toEqual(['a']);
    });

    test('should handle complex nested structures', () => {
        const obj1 = {
            a: 1,
            b: {
                c: 2,
                d: [1, { e: 3 }]
            },
            f: null
        };
        const obj2 = {
            a: 1,
            b: {
                c: 3,
                d: [1, { e: 4 }]
            },
            f: undefined
        };
        expect(computeJsonPaths(obj1, obj2)).toEqual(['b.c', 'b.d.1.e', 'f']);
    });
});