import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TablePagination,
    TextField,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
    Tooltip,
    CircularProgress,
    SelectChangeEvent
} from '@mui/material';
import { HelpOutline, Add } from '@mui/icons-material';
import { TransactionResult } from '#common/types/apiTypes';
import { isoStringWithOnlyDate } from '#common/utils/dateUtils';

interface TransactionListProps {
    // Add props if needed
}

export const TransactionList: React.FC<TransactionListProps> = () => {
    const [transactions, setTransactions] = useState<TransactionResult[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [sortBy, setSortBy] = useState<'createdAt' | 'saleDate'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/transactions?start=${page * rowsPerPage}&limit=${rowsPerPage}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${encodeURIComponent(search)}`
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
    }, [page, rowsPerPage, sortBy, sortOrder, search]);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSortChange = (event: SelectChangeEvent) => {
        setSortBy(event.target.value as 'createdAt' | 'saleDate');
    };

    const handleSortOrderChange = (event: SelectChangeEvent) => {
        setSortOrder(event.target.value as 'ASC' | 'DESC');
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value);
        setPage(0);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
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
                    size="small"
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Sort By</InputLabel>
                    <Select value={sortBy} onChange={handleSortChange} label="Sort By">
                        <MenuItem value="createdAt">Created Date</MenuItem>
                        <MenuItem value="saleDate">Sale Date</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Order</InputLabel>
                    <Select value={sortOrder} onChange={handleSortOrderChange} label="Order">
                        <MenuItem value="ASC">Ascending</MenuItem>
                        <MenuItem value="DESC">Descending</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            <TableContainer component={Paper} sx={{ position: 'relative', minHeight: 400 }}>
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
                            <TableCell>Entitlement ID</TableCell>
                            <TableCell>Sale Date</TableCell>
                            <TableCell>Addon Name</TableCell>
                            <TableCell>Sale Type</TableCell>
                            <TableCell>Company</TableCell>
                            <TableCell>Hosting</TableCell>
                            <TableCell>Tier</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Last Updated</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell>Updated</TableCell>
                            <TableCell>Versions</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transactions.map((tr) => (
                            <TableRow key={`${tr.transaction.id}`}>
                                <TableCell>{tr.transaction.entitlementId}</TableCell>
                                <TableCell>{tr.transaction.data.purchaseDetails.saleDate}</TableCell>
                                <TableCell>{tr.transaction.data.addonName}</TableCell>
                                <TableCell>{tr.transaction.data.purchaseDetails.saleType}</TableCell>
                                <TableCell>{tr.transaction.data.customerDetails.company}</TableCell>
                                <TableCell>{tr.transaction.data.purchaseDetails.hosting}</TableCell>
                                <TableCell>{tr.transaction.data.purchaseDetails.tier}</TableCell>
                                <TableCell>{formatCurrency(tr.transaction.data.purchaseDetails.vendorAmount)}</TableCell>
                                <TableCell>{tr.transaction.data.lastUpdated}</TableCell>
                                <TableCell>{isoStringWithOnlyDate(tr.transaction.createdAt.toString())}</TableCell>
                                <TableCell>{isoStringWithOnlyDate(tr.transaction.updatedAt.toString())}</TableCell>
                                <TableCell>
                                    {tr.versionCount}
                                    <IconButton size="small" color="primary">
                                        <Add fontSize="small" />
                                    </IconButton>
                                </TableCell>
                                <TableCell>
                                    <Tooltip title="View Details">
                                        <IconButton size="small">
                                            <HelpOutline fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

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