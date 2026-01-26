import React, { useState, useEffect } from 'react';
import {
    Box,
    TableRow,
    TablePagination,
    TextField,
    CircularProgress,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    InputAdornment,
    Button,
} from '@mui/material';
import { Search as SearchIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { TransactionQuerySortType, TransactionResult, AppInfo } from '#common/types/apiTypes';
import { StyledTableContainer, TableWrapper, LoadingOverlay, TableContainer, StyledTable, StyledTableHead, StyledTableBody, PaginationWrapper } from '../../components/styles';
import { TransactionDetailsDialog } from './TransactionDetailsDialog';
import { TransactionReconcileDialog } from './TransactionReconcileDialog';
import { SortOrder } from '../../components/SortableHeader';
import { StyledTableRow, StyledListPaper, StyledTableCell } from '../../components/styles';
import { ColumnConfigDialog } from '../../components/ColumnConfig';
import { useColumnConfig } from '../../components/useColumnConfig';
import { defaultTransactionColumns, TransactionCellContext } from './transactionColumns';
import { renderHeader, renderCell } from '../../components/columnRenderHelpers';
import { ResponsiveSearchContainer } from '../../components/ResponsiveSearchContainer';
import { CollapsibleFilters } from '../../components/CollapsibleFilters';

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
    const [loading, setLoading] = useState(true);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionResult | null>(null);
    const [selectedTransactionForReconcile, setSelectedTransactionForReconcile] = useState<TransactionResult | null>(null);
    const [reconciledFilter, setReconciledFilter] = useState<string>('');
    const [saleTypeFilter, setSaleTypeFilter] = useState<string>('');
    const [hostingFilter, setHostingFilter] = useState<string>('');
    const [appFilter, setAppFilter] = useState<string>('');
    const [apps, setApps] = useState<AppInfo[]>([]);
    const [loadingApps, setLoadingApps] = useState(false);
    const [showColumnConfig, setShowColumnConfig] = useState(false);

    const { columns, visibleColumns, updateColumns, isLoaded } = useColumnConfig(
        defaultTransactionColumns,
        'transaction-column-config'
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search.trim());
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const fetchApps = async () => {
        setLoadingApps(true);
        try {
            const response = await fetch('/api/apps');
            if (response.ok) {
                const appsData = await response.json();
                setApps(appsData);
            } else {
                console.error('Failed to fetch apps');
            }
        } catch (error) {
            console.error('Error fetching apps:', error);
        } finally {
            setLoadingApps(false);
        }
    };

    useEffect(() => {
        fetchApps();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const reconciledParam = reconciledFilter ? `&reconciled=${reconciledFilter}` : '';
            const saleTypeParam = saleTypeFilter ? `&saleType=${encodeURIComponent(saleTypeFilter)}` : '';
            const hostingParam = hostingFilter ? `&hosting=${encodeURIComponent(hostingFilter)}` : '';
            const appParam = appFilter ? `&addonKey=${encodeURIComponent(appFilter)}` : '';
            const response = await fetch(
                `/api/transactions?start=${page * rowsPerPage}&limit=${rowsPerPage}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${encodeURIComponent(debouncedSearch)}${reconciledParam}${saleTypeParam}${hostingParam}${appParam}`
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
    }, [page, rowsPerPage, sortBy, sortOrder, debouncedSearch, reconciledFilter, saleTypeFilter, hostingFilter, appFilter]);

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
            setDebouncedSearch(search.trim());
        }
    };

    const handleQuickReconcile = async (transaction: TransactionResult, reconciled: boolean) => {
        try {
            const response = await fetch(`/api/transactions/${transaction.transaction.id}/reconcile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reconciled,
                    notes: [`${reconciled ? 'Reconciled' : 'Unreconciled'} manually via quick action`]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update reconciliation status');
            }

            // Refresh the transaction list after reconciliation
            await fetchTransactions();
        } catch (error) {
            console.error('Error during quick reconciliation:', error);
            // TODO: Show error to user
        }
    };

    const handleReconcileSave = async (reconciled: boolean, notes: string) => {
        if (!selectedTransactionForReconcile) return;
        await handleQuickReconcile(selectedTransactionForReconcile, reconciled);
    };

    const handleReconciledFilterChange = (event: any) => {
        setReconciledFilter(event.target.value as string);
        setPage(0); // Reset to first page when filter changes
    };

    const handleSaleTypeFilterChange = (event: any) => {
        setSaleTypeFilter(event.target.value as string);
        setPage(0); // Reset to first page when filter changes
    };

    const handleHostingFilterChange = (event: any) => {
        setHostingFilter(event.target.value as string);
        setPage(0); // Reset to first page when filter changes
    };

    const handleAppFilterChange = (event: any) => {
        setAppFilter(event.target.value as string);
        setPage(0); // Reset to first page when filter changes
    };

    // Handlers to pass to cell renderers
    const cellContext: TransactionCellContext = {
        onQuickReconcile: handleQuickReconcile,
        onShowDetails: setSelectedTransactionForReconcile,
    };

    return (
        <TableContainer>
            <ResponsiveSearchContainer sx={{ mb: 0 }}>
                <TextField
                    className="search-field"
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
                <CollapsibleFilters label={<span className="filter-label">Filters:</span>}>
                    <FormControl size="small" className="filter-dropdown">
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
                    <FormControl size="small" className="filter-dropdown">
                        <InputLabel>Sale Type</InputLabel>
                        <Select
                            value={saleTypeFilter}
                            label="Sale Type"
                            onChange={handleSaleTypeFilterChange}
                        >
                            <MenuItem value="">All Sale Types</MenuItem>
                            <MenuItem value="New">New</MenuItem>
                            <MenuItem value="Refund">Refund</MenuItem>
                            <MenuItem value="Renewal">Renewal</MenuItem>
                            <MenuItem value="Upgrade">Upgrade</MenuItem>
                            <MenuItem value="Downgrade">Downgrade</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" className="filter-dropdown">
                        <InputLabel>Hosting</InputLabel>
                        <Select
                            value={hostingFilter}
                            label="Hosting"
                            onChange={handleHostingFilterChange}
                        >
                            <MenuItem value="">All Hosting</MenuItem>
                            <MenuItem value="Cloud">Cloud</MenuItem>
                            <MenuItem value="Data Center">Data Center</MenuItem>
                            <MenuItem value="Server">Server</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" className="filter-dropdown">
                        <InputLabel>App</InputLabel>
                        <Select
                            value={appFilter}
                            label="App"
                            onChange={handleAppFilterChange}
                        >
                            <MenuItem value="">All Apps</MenuItem>
                            {apps.map((app) => (
                                <MenuItem key={app.addonKey} value={app.addonKey}>
                                    {app.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </CollapsibleFilters>
                <Button
                    className="columns-button"
                    variant="outlined"
                    size="small"
                    startIcon={<SettingsIcon />}
                    onClick={() => setShowColumnConfig(true)}
                    sx={{ textTransform: 'none' }}
                >
                    Columns
                </Button>
            </ResponsiveSearchContainer>

            <Box aria-hidden sx={{ height: 16, flexShrink: 0 }} />

            <TableWrapper>
                <StyledTableContainer>
                    <StyledListPaper>
                        {loading && (
                            <LoadingOverlay>
                                <CircularProgress />
                            </LoadingOverlay>
                        )}
                        <StyledTable>
                            <StyledTableHead>
                                <TableRow>
                                    {visibleColumns.map((column) =>
                                        renderHeader(column, { sortBy, sortOrder, onSort: handleSort })
                                    )}
                                </TableRow>
                            </StyledTableHead>
                            <StyledTableBody>
                                {transactions && transactions.length > 0 ? (
                                    transactions.map((tr) => (
                                        <StyledTableRow
                                            key={`${tr.transaction.id}`}
                                            onClick={() => setSelectedTransaction(tr)}
                                        >
                                            {visibleColumns.map((column) =>
                                                renderCell(column, tr, cellContext)
                                            )}
                                        </StyledTableRow>
                                    ))
                                ) : ( !loading &&
                                    <StyledTableRow>
                                        <StyledTableCell colSpan={visibleColumns.length} align="center" sx={{ py: 4 }}>
                                            No transactions. Please configure the application through the Configuration page, then start all tasks on the Tasks page.
                                        </StyledTableCell>
                                    </StyledTableRow>
                                )}
                            </StyledTableBody>
                        </StyledTable>
                    </StyledListPaper>
                </StyledTableContainer>
            </TableWrapper>

            <PaginationWrapper>
                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                />
            </PaginationWrapper>

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

            <ColumnConfigDialog
                open={showColumnConfig}
                onClose={() => setShowColumnConfig(false)}
                columns={columns}
                onColumnsChange={updateColumns}
                title="Configure Transaction Columns"
                isLoaded={isLoaded}
            />
        </TableContainer>
    );
};