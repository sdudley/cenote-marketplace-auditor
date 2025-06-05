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
    Box,
    Tooltip,
    CircularProgress,
    TableSortLabel
} from '@mui/material';
import { HelpOutline, Add, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { TransactionQuerySortType, TransactionResult } from '#common/types/apiTypes';
import { isoStringWithOnlyDate } from '#common/utils/dateUtils';
import { SortArrows, StyledTableContainer, TableWrapper } from './styles';
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
            setSortOrder('ASC');
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
        <Box sx={{ width: '100%', p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                    label="Search"
                    variant="outlined"
                    value={search}
                    onChange={handleSearchChange}
                    onKeyPress={handleKeyPress}
                    size="small"
                />
            </Box>

            <TableWrapper>
                <StyledTableContainer>
                    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                        {loading && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                    zIndex: 1
                                }}
                            >
                                <CircularProgress />
                            </Box>
                        )}
                        <Table>
                            <TableHead>
                                <TableRow>
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
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>Last Updated</TableCell>
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
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {transactions && transactions.map((tr) => (
                                    <TableRow key={`${tr.transaction.id}`}>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{tr.transaction.entitlementId}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{tr.transaction.data.purchaseDetails.saleDate}</TableCell>
                                        <TableCell>{tr.transaction.data.addonName}</TableCell>
                                        <TableCell>{tr.transaction.data.purchaseDetails.saleType}</TableCell>
                                        <TableCell>{tr.transaction.data.customerDetails.company}</TableCell>
                                        <TableCell>{tr.transaction.data.purchaseDetails.hosting}</TableCell>
                                        <TableCell>{tr.transaction.data.purchaseDetails.tier}</TableCell>
                                        <TableCell>{formatCurrency(tr.transaction.data.purchaseDetails.vendorAmount)}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{tr.transaction.data.lastUpdated}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{isoStringWithOnlyDate(tr.transaction.createdAt.toString())}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{isoStringWithOnlyDate(tr.transaction.updatedAt.toString())}</TableCell>
                                        <TableCell>
                                            {tr.versionCount}
                                            <IconButton size="small" color="primary">
                                                <Add fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title="View Details">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setSelectedTransaction(tr)}
                                                >
                                                    <HelpOutline fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
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
        </Box>
    );
};