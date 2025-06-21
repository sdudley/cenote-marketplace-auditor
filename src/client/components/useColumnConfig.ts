import { useState, useEffect } from 'react';
import { ColumnConfig } from './ColumnConfig';

interface ColumnPreferences {
    order: string[]; // Array of column IDs in the desired order
    visibility: Record<string, boolean>; // Map of column ID to visibility
}

export const useColumnConfig = <T extends any, C extends any = any>(
    defaultColumns: ColumnConfig<T, C>[],
    storageKey: string
) => {
    const [columns, setColumns] = useState<ColumnConfig<T, C>[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load configuration from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const preferences: ColumnPreferences = JSON.parse(saved);

                // Create a map of default columns by ID for easy lookup
                const defaultColumnsMap = new Map(defaultColumns.map(col => [col.id, col]));

                // Apply saved order, filtering out any columns that no longer exist
                const validOrder = preferences.order?.filter(id => defaultColumnsMap.has(id)) || [];

                // Add any new columns that weren't in the saved order
                const newColumns = defaultColumns.filter(col => !validOrder.includes(col.id));
                const finalOrder = [...validOrder, ...newColumns.map(col => col.id)];

                // Apply saved visibility, using defaults for new columns
                const visibility = preferences.visibility || {};

                // Build the final column configuration
                const mergedColumns = finalOrder.map(id => {
                    const defaultCol = defaultColumnsMap.get(id);
                    if (!defaultCol) return null; // This shouldn't happen, but just in case

                    return {
                        ...defaultCol,
                        visible: visibility.hasOwnProperty(id) ? visibility[id] : defaultCol.visible
                    };
                }).filter(Boolean) as ColumnConfig<T, C>[];

                setColumns(mergedColumns);
            } catch (error) {
                console.warn('Failed to load column configuration:', error);
                setColumns(defaultColumns);
            }
        } else {
            // No saved preferences, use defaults
            setColumns(defaultColumns);
        }
        setIsLoaded(true);
    }, [defaultColumns, storageKey]);

    // Save configuration to localStorage when it changes
    const updateColumns = (newColumns: ColumnConfig<T, C>[]) => {
        setColumns(newColumns);

        // Only save the essential preferences
        const preferences: ColumnPreferences = {
            order: newColumns.map(col => col.id),
            visibility: Object.fromEntries(newColumns.map(col => [col.id, col.visible]))
        };

        localStorage.setItem(storageKey, JSON.stringify(preferences));
    };

    // Get only visible columns in their configured order
    const visibleColumns = columns.filter(col => col.visible);

    return {
        columns,
        visibleColumns,
        updateColumns,
        isLoaded
    };
};