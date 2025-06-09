import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableHead,
    TableRow,
    TablePagination,
    TextField,
    IconButton,
    CircularProgress,
    Box,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    InputAdornment,
    Tooltip
} from '@mui/material';
import { Add, CheckBox, CheckBoxOutlineBlank, Search as SearchIcon, Check, Close, InfoOutlined } from '@mui/icons-material';
import { TransactionQuerySortType, TransactionResult } from '#common/types/apiTypes';
import { isoStringWithOnlyDate } from '#common/utils/dateUtils';
import { formatCurrency } from '#common/utils/formatCurrency';
import { StyledTableContainer, TableWrapper, SearchContainer, LoadingOverlay, TableContainer, FilterContainer, FilterLabel } from '../styles';
import { TransactionDetailsDialog } from './TransactionDetailsDialog';
import { TransactionReconcileDialog } from './TransactionReconcileDialog';
import { SortOrder, SortableHeader } from '../SortableHeader';
import { StyledTableRow, StyledListPaper, TableCellNoWrap, StyledTableCell, TableCellCheckbox, StatusCell, StatusDot, StatusControlsBox, StatusIconButton, ReconcileButton, UnreconcileButton, ReconciliationHeaderCell, HoverActions } from '../styles';
import { TableHeaderCell } from '../styles';
import { StyledSandboxAnnotation } from '../styles';
import { dateDiff } from '#common/utils/dateUtils';

interface TransactionListProps {
    // Add props if needed
}

export const TransactionList: React.FC<TransactionListProps> = () => {
    const [transactions, setTransactions] = useState<TransactionResult[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [sortBy, setSortBy] = useState<TransactionQuerySortType>(TransactionQuerySortType.SaleDate);
    const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionResult | null>(null);
    const [selectedTransactionResultForVersions, setSelectedTransactionResultForVersions] = useState<TransactionResult | null>(null);
    const [selectedTransactionForReconcile, setSelectedTransactionForReconcile] = useState<TransactionResult | null>(null);
    const [reconciledFilter, setReconciledFilter] = useState<string>('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const reconciledParam = reconciledFilter ? `&reconciled=${reconciledFilter}` : '';
            const response = await fetch(
                `/api/transactions?start=${page * rowsPerPage}&limit=${rowsPerPage}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${encodeURIComponent(debouncedSearch)}${reconciledParam}`
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
    }, [page, rowsPerPage, sortBy, sortOrder, debouncedSearch, reconciledFilter]);

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
        setPage(0);
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

    const handleQuickReconcile = async (transaction: TransactionResult, reconciled: boolean) => {
        try {
            // TODO: Implement the API call to save reconciliation
            console.log('Quick reconciliation:', {
                transactionId: transaction.transaction.id,
                reconciled,
                notes: [`${reconciled ? 'Reconciled' : 'Unreconciled'} via quick action`]
            });
            // Refresh the transaction list after reconciliation
            await fetchTransactions();
        } catch (error) {
            console.error('Error during quick reconciliation:', error);
        }
    };

    const handleReconcileSave = async (reconciled: boolean, notes: string) => {
        if (!selectedTransactionForReconcile) return;
        await handleQuickReconcile(selectedTransactionForReconcile, reconciled);
    };

    const handleReconciledFilterChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        setReconciledFilter(event.target.value as string);
        setPage(0); // Reset to first page when filter changes
    };

    return (
        <TableContainer>
            <SearchContainer>
                <TextField
                    label=""
                    variant="outlined"
                    value={search}
                    onChange={handleSearchChange}
                    onKeyPress={handleKeyPress}
                    size="small"
                    placeholder="Search"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />
                <FilterLabel>Filters:</FilterLabel>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Reconciliation Status</InputLabel>
                    <Select
                        value={reconciledFilter}
                        label="Reconciliation Status"
                        onChange={handleReconciledFilterChange}
                    >
                        <MenuItem value="">All Transactions</MenuItem>
                        <MenuItem value="Y">Reconciled</MenuItem>
                        <MenuItem value="N">Unreconciled</MenuItem>
                    </Select>
                </FormControl>
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
                                    <ReconciliationHeaderCell>Reconciled</ReconciliationHeaderCell>
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
                                        <StatusCell onClick={(e) => e.stopPropagation()}>
                                            <StatusControlsBox>
                                                {tr.transaction.reconcile?.reconciled ? (
                                                    <Tooltip title={tr.transaction.reconcile.automatic ? "Auto Reconciled" : "Manually Reconciled"}>
                                                        <StatusDot
                                                            sx={{
                                                                bgcolor: tr.transaction.reconcile.automatic ? '#81C784' : '#4CAF50'
                                                            }}
                                                        />
                                                    </Tooltip>
                                                ) : (
                                                    <StatusDot />
                                                )}
                                                <HoverActions className="actions">
                                                    {!tr.transaction.reconcile?.reconciled ? (
                                                        <Tooltip title="Quick Reconcile">
                                                            <ReconcileButton
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleQuickReconcile(tr, true);
                                                                }}
                                                            >
                                                                <Check />
                                                            </ReconcileButton>
                                                        </Tooltip>
                                                    ) : (
                                                        <Tooltip title="Quick Unreconcile">
                                                            <UnreconcileButton
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleQuickReconcile(tr, false);
                                                                }}
                                                            >
                                                                <Close />
                                                            </UnreconcileButton>
                                                        </Tooltip>
                                                    )}
                                                    <Tooltip title="Reconciliation Details">
                                                        <StatusIconButton
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedTransactionForReconcile(tr);
                                                            }}
                                                        >
                                                            <InfoOutlined />
                                                        </StatusIconButton>
                                                    </Tooltip>
                                                </HoverActions>
                                            </StatusControlsBox>
                                        </StatusCell>
                                        <TableCellNoWrap>{tr.transaction.data.purchaseDetails.saleDate}</TableCellNoWrap>
                                        <TableCellNoWrap>{tr.transaction.entitlementId}</TableCellNoWrap>
                                        <StyledTableCell>{tr.transaction.data.addonName}</StyledTableCell>
                                        <StyledTableCell>{tr.transaction.data.purchaseDetails.saleType}</StyledTableCell>
                                        <StyledTableCell>{tr.transaction.data.purchaseDetails.hosting}</StyledTableCell>
                                        <StyledTableCell>
                                            {tr.transaction.data.purchaseDetails.tier}
                                            {tr.isSandbox && <StyledSandboxAnnotation>Sandbox</StyledSandboxAnnotation>}
                                        </StyledTableCell>
                                        <StyledTableCell>
                                            {tr.transaction.data.customerDetails.company}
                                            {tr.isSandbox && tr.cloudSiteHostname &&<StyledSandboxAnnotation>({tr.cloudSiteHostname})</StyledSandboxAnnotation>}
                                        </StyledTableCell>
                                        <StyledTableCell>{formatCurrency(tr.transaction.data.purchaseDetails.vendorAmount)}</StyledTableCell>
                                        <StyledTableCell>{dateDiff(tr.transaction.data.purchaseDetails.maintenanceStartDate, tr.transaction.data.purchaseDetails.maintenanceEndDate)} days</StyledTableCell>
                                        <TableCellNoWrap>{isoStringWithOnlyDate(tr.transaction.createdAt.toString())}</TableCellNoWrap>
                                        <TableCellNoWrap>{isoStringWithOnlyDate(tr.transaction.updatedAt.toString())}</TableCellNoWrap>
                                        <StyledTableCell>
                                            {tr.versionCount}
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