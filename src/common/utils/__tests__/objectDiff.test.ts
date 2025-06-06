import { getObjectDiff, JsonDelta } from '../objectDiff';

describe('objectDiff', () => {
    it('should detect unchanged primitive values', () => {
        const oldObj = { value: 42 };
        const newObj = { value: 42 };

        const diff = getObjectDiff(oldObj, newObj);

        expect(diff.value).toEqual({
            changeType: 'unchanged',
            oldValue: 42,
            newValue: 42
        });
    });

    it('should detect changed primitive values', () => {
        const oldObj = { value: 42 };
        const newObj = { value: 43 };

        const diff = getObjectDiff(oldObj, newObj);

        expect(diff.value).toEqual({
            changeType: 'changed',
            oldValue: 42,
            newValue: 43
        });
    });

    it('should detect added and removed keys', () => {
        const oldObj = { a: 1, b: 2 };
        const newObj = { a: 1, c: 3 };

        const diff = getObjectDiff(oldObj, newObj);

        expect(diff.a).toEqual({
            changeType: 'unchanged',
            oldValue: 1,
            newValue: 1
        });
        expect(diff.b).toEqual({
            changeType: 'removed',
            oldValue: 2
        });
        expect(diff.c).toEqual({
            changeType: 'added',
            newValue: 3
        });
    });

    it('should handle nested objects', () => {
        const oldObj = {
            user: {
                name: 'John',
                age: 30,
                address: {
                    city: 'Boston',
                    zip: '02108'
                }
            }
        };
        const newObj = {
            user: {
                name: 'John',
                age: 31,
                address: {
                    city: 'New York',
                    zip: '02108'
                }
            }
        };

        const diff = getObjectDiff(oldObj, newObj);

        expect(diff.user).toEqual({
            changeType: 'unchanged',
            children: {
                name: {
                    changeType: 'unchanged',
                    oldValue: 'John',
                    newValue: 'John'
                },
                age: {
                    changeType: 'changed',
                    oldValue: 30,
                    newValue: 31
                },
                address: {
                    changeType: 'unchanged',
                    children: {
                        city: {
                            changeType: 'changed',
                            oldValue: 'Boston',
                            newValue: 'New York'
                        },
                        zip: {
                            changeType: 'unchanged',
                            oldValue: '02108',
                            newValue: '02108'
                        }
                    }
                }
            }
        });
    });

    it('should handle arrays', () => {
        const oldObj = {
            items: [1, 2, { id: 1, value: 'a' }]
        };
        const newObj = {
            items: [1, 3, { id: 1, value: 'b' }]
        };

        const diff = getObjectDiff(oldObj, newObj);

        expect(diff.items).toEqual({
            changeType: 'changed',
            oldValue: [1, 2, { id: 1, value: 'a' }],
            newValue: [1, 3, { id: 1, value: 'b' }]
        });
    });

    it('should handle nested arrays', () => {
        const oldObj = {
            matrix: [[1, 2], [3, 4]]
        };
        const newObj = {
            matrix: [[1, 2], [3, 5]]
        };

        const diff = getObjectDiff(oldObj, newObj);

        expect(diff.matrix).toEqual({
            changeType: 'changed',
            oldValue: [[1, 2], [3, 4]],
            newValue: [[1, 2], [3, 5]]
        });
    });

    it('should handle type mismatches', () => {
        const oldObj = { value: 42 };
        const newObj = { value: '42' };

        const diff = getObjectDiff(oldObj, newObj);

        expect(diff.value).toEqual({
            changeType: 'changed',
            oldValue: 42,
            newValue: '42'
        });
    });

    it('should handle null values', () => {
        const oldObj = { value: null };
        const newObj = { value: 42 };

        const diff = getObjectDiff(oldObj, newObj);

        expect(diff.value).toEqual({
            changeType: 'changed',
            oldValue: null,
            newValue: 42
        });
    });
});