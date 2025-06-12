import { TableSortLabel, Box } from "@mui/material";
import { UnsortedArrows } from "./UnsortedArrows";
import { TableCell } from "@mui/material";
import { TableHeaderCell } from "./styles";
import { ReactNode } from "react";

export type SortOrder = 'ASC' | 'DESC';

interface SortableHeaderProps<T> {
    field: T;
    label: string|ReactNode;
    currentSort: T;
    currentOrder: SortOrder;
    onSort: (field: T) => void;
    whiteSpace?: boolean;
    align?: 'left' | 'center' | 'right';
}

export const SortableHeader = <T,>({ field, label, currentSort, currentOrder, onSort, whiteSpace, align }: SortableHeaderProps<T>) => (
    <TableHeaderCell align={align}>
        <Box sx={{ display: 'flex', justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
            <TableSortLabel
                active={currentSort === field}
                direction={currentSort === field ? currentOrder.toLowerCase() as 'asc' | 'desc' : 'asc'}
                onClick={() => onSort(field)}
                sx={{ whiteSpace: whiteSpace ? 'nowrap' : 'normal' }}
                IconComponent={currentSort === field ? undefined : UnsortedArrows}
            >
                {label}
            </TableSortLabel>
        </Box>
    </TableHeaderCell>
);