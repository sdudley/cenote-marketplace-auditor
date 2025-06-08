import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TablePagination,
    TextField,
    IconButton,
    CircularProgress,
    Box
} from '@mui/material';
import { Add, CheckBox, CheckBoxOutlineBlank } from '@mui/icons-material';
import { TransactionQuerySortType, TransactionResult } from '#common/types/apiTypes';
import { isoStringWithOnlyDate } from '#common/utils/dateUtils';
import { formatCurrency } from '#common/utils/formatCurrency';
import { StyledTableContainer, TableWrapper, SearchContainer, LoadingOverlay, TableContainer } from '../styles';
import { TransactionDetailsDialog } from './TransactionDetailsDialog';
import { TransactionVersionListDialog } from './TransactionVersionListDialog';
import { TransactionReconcileDialog } from './TransactionReconcileDialog';
import { SortOrder, SortableHeader } from '../SortableHeader';
import { StyledTableRow, StyledListPaper, TableCellNoWrap, StyledTableCell, TableCellCheckbox } from '../styles';
import { TableHeaderCell } from '../styles';

interface TransactionListProps {
    // Add props if needed
}

export const TransactionList: React.FC<TransactionListProps> = () => {
    const [transactions, setTransactions] = useState<TransactionResult[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [sortBy, setSortBy] = useState<TransactionQuerySortType>(TransactionQuerySortType.CreatedAt);
    const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionResult | null>(null);
    const [selectedTransactionResultForVersions, setSelectedTransactionResultForVersions] = useState<TransactionResult | null>(null);
    const [selectedTransactionForReconcile, setSelectedTransactionForReconcile] = useState<TransactionResult | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/transactions?start=${page * rowsPerPage}&limit=${rowsPerPage}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${encodeURIComponent(debouncedSearch)}`
            );
            const data = await response.json();
            setTransactions(data.transactions);
            setTotal(data.total);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [page, rowsPerPage, sortBy, sortOrder, debouncedSearch]);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSort = (field: TransactionQuerySortType) => {
        if (field === sortBy) {
            setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
        } else {
            setSortBy(field);
            setSortOrder('DESC');
        }
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value);
        setPage(0);
    };

    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            setDebouncedSearch(search);
        }
    };

    const handleReconcileSave = async (reconciled: boolean, notes: string) => {
        if (!selectedTransactionForReconcile) return;

        try {
            // TODO: Implement the API call to save reconciliation
            console.log('Saving reconciliation:', {
                transactionId: selectedTransactionForReconcile.transaction.id,
                reconciled,
                notes
            });
        } catch (error) {
            console.error('Error saving reconciliation:', error);
            throw error;
        }
    };

    return (
        <TableContainer>
            <SearchContainer>
                <TextField
                    label="Search"
                    variant="outlined"
                    value={search}
                    onChange={handleSearchChange}
                    onKeyPress={handleKeyPress}
                    size="small"
                />
            </SearchContainer>

            <TableWrapper>
                <StyledTableContainer>
                    <StyledListPaper>
                        {loading && (
                            <LoadingOverlay>
                                <CircularProgress />
                            </LoadingOverlay>
                        )}
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeaderCell>Reconciled</TableHeaderCell>
                                    <SortableHeader<TransactionQuerySortType>
                                        field={TransactionQuerySortType.SaleDate}
                                        label="Sale Date"
                                        currentSort={sortBy}
                                        currentOrder={sortOrder}
                                        onSort={handleSort}
                                        whiteSpace
                                    />
                                    <TableHeaderCell sx={{ whiteSpace: 'nowrap' }}>Entitlement ID</TableHeaderCell>
                                    <TableHeaderCell>App</TableHeaderCell>
                                    <TableHeaderCell>Sale Type</TableHeaderCell>
                                    <TableHeaderCell>Hosting</TableHeaderCell>
                                    <TableHeaderCell>Tier</TableHeaderCell>
                                    <TableHeaderCell>Company</TableHeaderCell>
                                    <SortableHeader<TransactionQuerySortType>
                                        field={TransactionQuerySortType.VendorAmount}
                                        label="Amount"
                                        currentSort={sortBy}
                                        currentOrder={sortOrder}
                                        onSort={handleSort}
                                        whiteSpace
                                    />
                                    <TableHeaderCell>Maintenance</TableHeaderCell>
                                    <SortableHeader<TransactionQuerySortType>
                                        field={TransactionQuerySortType.CreatedAt}
                                        label="Created"
                                        currentSort={sortBy}
                                        currentOrder={sortOrder}
                                        onSort={handleSort}
                                        whiteSpace
                                    />
                                    <SortableHeader<TransactionQuerySortType>
                                        field={TransactionQuerySortType.UpdatedAt}
                                        label="Updated"
                                        currentSort={sortBy}
                                        currentOrder={sortOrder}
                                        onSort={handleSort}
                                        whiteSpace
                                    />
                                    <SortableHeader<TransactionQuerySortType>
                                        field={TransactionQuerySortType.VersionCount}
                                        label="Versions"
                                        currentSort={sortBy}
                                        currentOrder={sortOrder}
                                        onSort={handleSort}
                                        whiteSpace
                                    />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {transactions && transactions.map((tr) => (
                                    <StyledTableRow
                                        key={`${tr.transaction.id}`}
                                        onClick={() => setSelectedTransaction(tr)}
                                    >
                                        <TableCellCheckbox>
                                            {tr.transaction.reconcile?.reconciled ? (
                                                <CheckBox
                                                    color="success"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTransactionForReconcile(tr);
                                                    }}
                                                />
                                            ) : (
                                                <CheckBoxOutlineBlank
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedTransactionForReconcile(tr);
                                                    }}
                                                />
                                            )}
                                        </TableCellCheckbox>
                                        <TableCellNoWrap>{tr.transaction.data.purchaseDetails.saleDate}</TableCellNoWrap>
                                        <TableCellNoWrap>{tr.transaction.entitlementId}</TableCellNoWrap>
                                        <StyledTableCell>{tr.transaction.data.addonName}</StyledTableCell>
                                        <StyledTableCell>{tr.transaction.data.purchaseDetails.saleType}</StyledTableCell>
                                        <StyledTableCell>{tr.transaction.data.purchaseDetails.hosting}</StyledTableCell>
                                        <StyledTableCell>{tr.transaction.data.purchaseDetails.tier}</StyledTableCell>
                                        <StyledTableCell>{tr.transaction.data.customerDetails.company}</StyledTableCell>
                                        <StyledTableCell>{formatCurrency(tr.transaction.data.purchaseDetails.vendorAmount)}</StyledTableCell>
                                        <StyledTableCell>{tr.transaction.data.purchaseDetails.maintenanceStartDate} - {tr.transaction.data.purchaseDetails.maintenanceEndDate}</StyledTableCell>
                                        <TableCellNoWrap>{isoStringWithOnlyDate(tr.transaction.createdAt.toString())}</TableCellNoWrap>
                                        <TableCellNoWrap>{isoStringWithOnlyDate(tr.transaction.updatedAt.toString())}</TableCellNoWrap>
                                        <StyledTableCell>
                                            {tr.versionCount}
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedTransactionResultForVersions(tr);
                                                }}
                                            >
                                                <Add fontSize="small" />
                                            </IconButton>
                                        </StyledTableCell>
                                    </StyledTableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </StyledListPaper>
                </StyledTableContainer>
            </TableWrapper>

            <TransactionDetailsDialog
                transaction={selectedTransaction}
                open={!!selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
            />

            <TransactionVersionListDialog
                transactionResult={selectedTransactionResultForVersions}
                open={!!selectedTransactionResultForVersions}
                onClose={() => setSelectedTransactionResultForVersions(null)}
            />

            <TransactionReconcileDialog
                transaction={selectedTransactionForReconcile}
                open={!!selectedTransactionForReconcile}
                onClose={() => setSelectedTransactionForReconcile(null)}
                onSave={handleReconcileSave}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                />
            </Box>
        </TableContainer>
    );
};