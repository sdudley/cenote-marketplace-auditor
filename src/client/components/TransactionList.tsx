import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Paper,
    TablePagination,
    TextField,
    IconButton,
    Tooltip,
    CircularProgress,
    TableSortLabel
} from '@mui/material';
import { Visibility, Add, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { TransactionQuerySortType, TransactionResult } from '#common/types/apiTypes';
import { isoStringWithOnlyDate } from '#common/utils/dateUtils';
import { SortArrows, StyledTableContainer, TableWrapper, SearchContainer, LoadingOverlay, TableContainer } from './styles';
import { TransactionDetails } from './TransactionDetails';

interface TransactionListProps {
    // Add props if needed
}

type SortOrder = 'ASC' | 'DESC';

const SortableHeader: React.FC<{
    field: TransactionQuerySortType;
    label: string;
    currentSort: TransactionQuerySortType;
    currentOrder: SortOrder;
    onSort: (field: TransactionQuerySortType) => void;
    whiteSpace?: boolean;
}> = ({ field, label, currentSort, currentOrder, onSort, whiteSpace }) => (
    <TableCell>
        <TableSortLabel
            active={currentSort === field}
            direction={currentSort === field ? currentOrder.toLowerCase() as 'asc' | 'desc' : 'asc'}
            onClick={() => onSort(field)}
            sx={{ whiteSpace: whiteSpace ? 'nowrap' : 'normal' }}
            IconComponent={currentSort === field ? undefined : () => (
                <SortArrows>
                    <ArrowUpward />
                    <ArrowDownward />
                </SortArrows>
            )}
        >
            {label}
        </TableSortLabel>
    </TableCell>
);

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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
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
                    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                        {loading && (
                            <LoadingOverlay>
                                <CircularProgress />
                            </LoadingOverlay>
                        )}
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ width: 40, padding: 0 }}></TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>Entitlement ID</TableCell>
                                    <SortableHeader
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
                                    <SortableHeader
                                        field={TransactionQuerySortType.CreatedAt}
                                        label="Created"
                                        currentSort={sortBy}
                                        currentOrder={sortOrder}
                                        onSort={handleSort}
                                        whiteSpace
                                    />
                                    <SortableHeader
                                        field={TransactionQuerySortType.UpdatedAt}
                                        label="Updated"
                                        currentSort={sortBy}
                                        currentOrder={sortOrder}
                                        onSort={handleSort}
                                        whiteSpace
                                    />
                                    <SortableHeader
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
                                    <TableRow key={`${tr.transaction.id}`}>
                                        <TableCell sx={{ width: 40, padding: 0 }}>
                                            <Tooltip title="View Details">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setSelectedTransaction(tr)}
                                                >
                                                    <Visibility fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{tr.transaction.entitlementId}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{tr.transaction.data.purchaseDetails.saleDate}</TableCell>
                                        <TableCell>{tr.transaction.data.addonName}</TableCell>
                                        <TableCell>{tr.transaction.data.purchaseDetails.saleType}</TableCell>
                                        <TableCell>{tr.transaction.data.customerDetails.company}</TableCell>
                                        <TableCell>{tr.transaction.data.purchaseDetails.hosting}</TableCell>
                                        <TableCell>{tr.transaction.data.purchaseDetails.tier}</TableCell>
                                        <TableCell>{formatCurrency(tr.transaction.data.purchaseDetails.vendorAmount)}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{isoStringWithOnlyDate(tr.transaction.createdAt.toString())}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{isoStringWithOnlyDate(tr.transaction.updatedAt.toString())}</TableCell>
                                        <TableCell>
                                            {tr.versionCount}
                                            <IconButton size="small" color="primary">
                                                <Add fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                </StyledTableContainer>
            </TableWrapper>

            <TransactionDetails
                transaction={selectedTransaction}
                open={!!selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
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