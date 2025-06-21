import React from 'react';
import { TransactionQuerySortType, TransactionResult } from '#common/types/apiTypes';
import { SortOrder, SortableHeader } from './SortableHeader';
import { TableHeaderCell, StyledTableCell, TableCellNoWrap } from './styles';
import { ColumnConfig } from './ColumnConfig';

// Automatic header renderer based on column properties
export const renderHeader = (
    column: ColumnConfig,
    props: {
        sortBy: TransactionQuerySortType;
        sortOrder: SortOrder;
        onSort: (field: TransactionQuerySortType) => void;
    }
) => {
    // If column has renderFullHeader, use it for custom header rendering
    if (column.renderFullHeader) {
        return column.renderFullHeader();
    }

    // If column has sortField, it's sortable
    if (column.sortField) {
        return (
            <SortableHeader<TransactionQuerySortType>
                key={column.id}
                field={column.sortField}
                label={column.label}
                currentSort={props.sortBy}
                currentOrder={props.sortOrder}
                onSort={props.onSort}
                whiteSpace
                align={column.align}
                tooltip={column.tooltip}
            />
        );
    }

    // Default simple header
    return (
        <TableHeaderCell key={column.id} align={column.align} sx={{ whiteSpace: column.nowrap ? 'nowrap' : 'normal' }}>
            {column.label}
        </TableHeaderCell>
    );
};

// Automatic cell renderer based on column properties
export const renderCell = (column: ColumnConfig, transaction: TransactionResult, context?: any) => {
    // If column has renderFullCell, use it for complex custom rendering
    if (column.renderFullCell) {
        return column.renderFullCell(transaction, context);
    }

    // If column has renderSimpleCell, wrap it in appropriate cell component
    if (column.renderSimpleCell) {
        const content = column.renderSimpleCell(transaction, context);
        const CellComponent = column.nowrap ? TableCellNoWrap : StyledTableCell;

        return (
            <CellComponent key={column.id} align={column.align}>
                {content}
            </CellComponent>
        );
    }

    // Default empty cell
    return (
        <StyledTableCell key={column.id} align={column.align}></StyledTableCell>
    );
};