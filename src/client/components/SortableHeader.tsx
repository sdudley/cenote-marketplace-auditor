import { TableSortLabel } from "@mui/material";
import { UnsortedArrows } from "./UnsortedArrows";
import { TableCell } from "@mui/material";

export type SortOrder = 'ASC' | 'DESC';

interface SortableHeaderProps<T> {
    field: T;
    label: string;
    currentSort: T;
    currentOrder: SortOrder;
    onSort: (field: T) => void;
    whiteSpace?: boolean;
}

export const SortableHeader = <T,>({ field, label, currentSort, currentOrder, onSort, whiteSpace }: SortableHeaderProps<T>) => (
    <TableCell>
        <TableSortLabel
            active={currentSort === field}
            direction={currentSort === field ? currentOrder.toLowerCase() as 'asc' | 'desc' : 'asc'}
            onClick={() => onSort(field)}
            sx={{ whiteSpace: whiteSpace ? 'nowrap' : 'normal' }}
            IconComponent={currentSort === field ? undefined : UnsortedArrows}
        >
            {label}
        </TableSortLabel>
    </TableCell>
);