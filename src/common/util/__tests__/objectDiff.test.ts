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

    it('should handle undefined oldObj with nested objects', () => {
        const oldObj = undefined;
        const newObj = {
            user: {
                name: 'John',
                age: 30,
                address: {
                    city: 'New York',
                    zip: '02108'
                }
            },
            metadata: {
                version: 1,
                tags: ['important', 'new']
            }
        };

        const diff = getObjectDiff(oldObj, newObj);

        expect(diff.user).toEqual({
            changeType: 'added',
            children: {
                name: {
                    changeType: 'added',
                    newValue: 'John'
                },
                age: {
                    changeType: 'added',
                    newValue: 30
                },
                address: {
                    changeType: 'added',
                    children: {
                        city: {
                            changeType: 'added',
                            newValue: 'New York'
                        },
                        zip: {
                            changeType: 'added',
                            newValue: '02108'
                        }
                    }
                }
            }
        });
        expect(diff.metadata).toEqual({
            changeType: 'added',
            children: {
                version: {
                    changeType: 'added',
                    newValue: 1
                },
                tags: {
                    changeType: 'added',
                    newValue: ['important', 'new']
                }
            }
        });
    });

    it('should handle new object key with nested key/value pairs', () => {
        const oldObj = {
            user: {
                name: 'John',
                age: 30
            }
        };
        const newObj = {
            user: {
                name: 'John',
                age: 30
            },
            settings: {
                theme: 'dark',
                notifications: {
                    email: true,
                    push: false,
                    frequency: 'daily'
                },
                preferences: {
                    language: 'en',
                    timezone: 'UTC'
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
                    changeType: 'unchanged',
                    oldValue: 30,
                    newValue: 30
                }
            }
        });
        expect(diff.settings).toEqual({
            changeType: 'added',
            children: {
                theme: {
                    changeType: 'added',
                    newValue: 'dark'
                },
                notifications: {
                    changeType: 'added',
                    children: {
                        email: {
                            changeType: 'added',
                            newValue: true
                        },
                        push: {
                            changeType: 'added',
                            newValue: false
                        },
                        frequency: {
                            changeType: 'added',
                            newValue: 'daily'
                        }
                    }
                },
                preferences: {
                    changeType: 'added',
                    children: {
                        language: {
                            changeType: 'added',
                            newValue: 'en'
                        },
                        timezone: {
                            changeType: 'added',
                            newValue: 'UTC'
                        }
                    }
                }
            }
        });
    });

    it('should sort children alphabetically by key', () => {
        const oldObj = {
            user: {
                name: 'John',
                age: 30
            }
        };
        const newObj = {
            user: {
                name: 'John',
                age: 30
            },
            settings: {
                theme: 'dark',
                notifications: {
                    email: true,
                    push: false,
                    frequency: 'daily'
                },
                preferences: {
                    language: 'en',
                    timezone: 'UTC'
                }
            }
        };

        const diff = getObjectDiff(oldObj, newObj);

        // Get the keys from the settings children
        const settingsChildrenKeys = Object.keys(diff.settings.children!);

        // Verify they are sorted alphabetically
        expect(settingsChildrenKeys).toEqual(['notifications', 'preferences', 'theme']);

        // Verify nested children are also sorted
        const notificationsKeys = Object.keys(diff.settings.children!.notifications.children!);
        expect(notificationsKeys).toEqual(['email', 'frequency', 'push']);

        const preferencesKeys = Object.keys(diff.settings.children!.preferences.children!);
        expect(preferencesKeys).toEqual(['language', 'timezone']);
    });

    it('should handle removed keys that have children', () => {
        const oldObj = {
            user: {
                name: 'John',
                age: 30,
                address: {
                    city: 'Boston',
                    zip: '02108',
                    country: 'USA'
                },
                preferences: {
                    theme: 'dark',
                    language: 'en'
                }
            },
            metadata: {
                version: 1,
                tags: ['important']
            }
        };
        const newObj = {
            user: {
                name: 'John',
                age: 30
            },
            metadata: {
                version: 1,
                tags: ['important']
            }
        };

        const diff = getObjectDiff(oldObj, newObj);

        // Verify the removed address object preserves its children
        expect(diff.user.children!.address).toEqual({
            changeType: 'removed',
            children: {
                city: {
                    changeType: 'removed',
                    oldValue: 'Boston'
                },
                zip: {
                    changeType: 'removed',
                    oldValue: '02108'
                },
                country: {
                    changeType: 'removed',
                    oldValue: 'USA'
                }
            }
        });

        // Verify the removed preferences object preserves its children
        expect(diff.user.children!.preferences).toEqual({
            changeType: 'removed',
            children: {
                theme: {
                    changeType: 'removed',
                    oldValue: 'dark'
                },
                language: {
                    changeType: 'removed',
                    oldValue: 'en'
                }
            }
        });

        // Verify unchanged keys remain unchanged
        expect(diff.user.children!.name).toEqual({
            changeType: 'unchanged',
            oldValue: 'John',
            newValue: 'John'
        });
        expect(diff.user.children!.age).toEqual({
            changeType: 'unchanged',
            oldValue: 30,
            newValue: 30
        });

        // Verify metadata is unchanged
        expect(diff.metadata).toEqual({
            changeType: 'unchanged',
            children: {
                version: {
                    changeType: 'unchanged',
                    oldValue: 1,
                    newValue: 1
                },
                tags: {
                    changeType: 'unchanged',
                    oldValue: ['important'],
                    newValue: ['important']
                }
            }
        });
    });
});