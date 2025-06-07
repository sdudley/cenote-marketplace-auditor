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
    CircularProgress
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { TransactionQuerySortType, TransactionResult } from '#common/types/apiTypes';
import { isoStringWithOnlyDate } from '#common/utils/dateUtils';
import { formatCurrency } from '#common/utils/formatCurrency';
import { StyledTableContainer, TableWrapper, SearchContainer, LoadingOverlay, TableContainer } from '../styles';
import { TransactionDetailsDialog } from './TransactionDetailsDialog';
import { TransactionVersionListDialog } from './TransactionVersionListDialog';
import { SortOrder, SortableHeader } from '../SortableHeader';
import { StyledTableRow, StyledListPaper, TableCellNoWrap } from '../styles';

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
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>Entitlement ID</TableCell>
                                    <SortableHeader<TransactionQuerySortType>
                                        field={TransactionQuerySortType.SaleDate}
                                        label="Sale Date"
                                        currentSort={sortBy}
                                        currentOrder={sortOrder}
                                        onSort={handleSort}
                                        whiteSpace
                                    />
                                    <TableCell>App</TableCell>
                                    <TableCell>Sale Type</TableCell>
                                    <TableCell>Company</TableCell>
                                    <TableCell>Hosting</TableCell>
                                    <TableCell>Tier</TableCell>
                                    <TableCell>Amount</TableCell>
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
                                        <TableCellNoWrap>{tr.transaction.entitlementId}</TableCellNoWrap>
                                        <TableCellNoWrap>{tr.transaction.data.purchaseDetails.saleDate}</TableCellNoWrap>
                                        <TableCell>{tr.transaction.data.addonName}</TableCell>
                                        <TableCell>{tr.transaction.data.purchaseDetails.saleType}</TableCell>
                                        <TableCell>{tr.transaction.data.customerDetails.company}</TableCell>
                                        <TableCell>{tr.transaction.data.purchaseDetails.hosting}</TableCell>
                                        <TableCell>{tr.transaction.data.purchaseDetails.tier}</TableCell>
                                        <TableCell>{formatCurrency(tr.transaction.data.purchaseDetails.vendorAmount)}</TableCell>
                                        <TableCellNoWrap>{isoStringWithOnlyDate(tr.transaction.createdAt.toString())}</TableCellNoWrap>
                                        <TableCellNoWrap>{isoStringWithOnlyDate(tr.transaction.updatedAt.toString())}</TableCellNoWrap>
                                        <TableCell>
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
                                        </TableCell>
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

            <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
            />
        </TableContainer>
    );
};