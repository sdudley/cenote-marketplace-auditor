import { ColumnConfig } from './ColumnConfig';

export const enforceLastColumnOrder = (order: string[], lastColumnIds: string[]): string[] => {
    if (lastColumnIds.length === 0) {
        return order;
    }

    const lastIdSet = new Set(lastColumnIds);
    const otherIds = order.filter(id => !lastIdSet.has(id));
    const presentLastIds = lastColumnIds.filter(id => order.includes(id));

    return [...otherIds, ...presentLastIds];
};

export const enforceLastColumns = <T extends any, C extends any, S extends any = any>(
    columns: ColumnConfig<T, C, S>[],
    lastColumnIds: string[]
): ColumnConfig<T, C, S>[] => {
    if (lastColumnIds.length === 0) {
        return columns;
    }

    const lastIdSet = new Set(lastColumnIds);
    const otherColumns = columns.filter(col => !lastIdSet.has(col.id));
    const lastColumns = lastColumnIds
        .map(id => columns.find(col => col.id === id))
        .filter((col): col is ColumnConfig<T, C, S> => col !== undefined);

    return [...otherColumns, ...lastColumns];
};
