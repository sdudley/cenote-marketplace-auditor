import React, { useState, useEffect } from 'react';
import {
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
import { isoStringWithOnlyDate } from '#common/util/dateUtils';
import { formatCurrency } from '#common/util/formatCurrency';
import { StyledTableContainer, TableWrapper, SearchContainer, LoadingOverlay, TableContainer, FilterLabel, StyledTable, StyledTableHead, StyledTableBody, PaginationWrapper } from '../../components/styles';
import { TransactionDetailsDialog } from './TransactionDetailsDialog';
import { TransactionReconcileDialog } from './TransactionReconcileDialog';
import { ReconciliationControls } from './ReconciliationControls';
import { SortOrder, SortableHeader } from '../../components/SortableHeader';
import { StyledTableRow, StyledListPaper, TableCellNoWrap, StyledTableCell, TableCellCheckbox, StatusCell, StatusDot, StatusControlsBox, StatusIconButton, ReconcileButton, UnreconcileButton, ReconciliationHeaderCell, HoverActions } from '../../components/styles';
import { TableHeaderCell } from '../../components/styles';
import { EmphasizedAnnotation } from '../../components/styles';
import { dateDiff } from '#common/util/dateUtils';
import { HighlightIfSignificantlyDifferent } from '../../components/HighlightIfSignificantlyDifferent';
import { sumDiscountArrayForTransaction } from '#common/util/transactionDiscounts.js';
import { TransactionDiscount,  } from '#common/types/marketplace';
import { mapDiscountTypeToDescription } from './util';
import { ColumnConfigDialog } from '../../components/ColumnConfig';
import { useColumnConfig } from '../../components/useColumnConfig';
import { defaultTransactionColumns } from './transactionColumns';

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
            setDebouncedSearch(search);
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
            setDebouncedSearch(search);
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

    const renderTableHeader = (column: any) => {
        if (column.id === 'saleDate') {
            return (
                <SortableHeader<TransactionQuerySortType>
                    key={column.id}
                    field={column.sortField}
                    label={column.label}
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                    whiteSpace
                />
            );
        }
        if (column.id === 'amount') {
            return (
                <SortableHeader<TransactionQuerySortType>
                    key={column.id}
                    field={column.sortField}
                    label={column.label}
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                    whiteSpace
                    align="right"
                />
            );
        }
        if (column.id === 'discounts') {
            return (
                <SortableHeader<TransactionQuerySortType>
                    key={column.id}
                    field={column.sortField}
                    label={column.label}
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                    whiteSpace
                />
            );
        }
        if (column.id === 'maintenanceDays') {
            return (
                <SortableHeader<TransactionQuerySortType>
                    key={column.id}
                    field={column.sortField}
                    label={column.label}
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                    whiteSpace
                />
            );
        }
        if (column.id === 'createdAt') {
            return (
                <SortableHeader<TransactionQuerySortType>
                    key={column.id}
                    field={column.sortField}
                    label={column.label}
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                    whiteSpace
                    tooltip={column.tooltip}
                />
            );
        }
        if (column.id === 'updatedAt') {
            return (
                <SortableHeader<TransactionQuerySortType>
                    key={column.id}
                    field={column.sortField}
                    label={column.label}
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                    whiteSpace
                    tooltip={column.tooltip}
                />
            );
        }
        if (column.id === 'versionCount') {
            return (
                <SortableHeader<TransactionQuerySortType>
                    key={column.id}
                    field={column.sortField}
                    label={column.label}
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                    whiteSpace
                    tooltip={column.tooltip}
                />
            );
        }
        if (column.id === 'entitlementId') {
            return (
                <TableHeaderCell key={column.id} sx={{ whiteSpace: 'nowrap' }}>
                    {column.label}
                </TableHeaderCell>
            );
        }
        if (column.id === 'expectedAmount') {
            return (
                <TableHeaderCell key={column.id} align="right">
                    {column.label}
                </TableHeaderCell>
            );
        }
        if (column.id === 'reconciliation') {
            return (
                <ReconciliationHeaderCell key={column.id}></ReconciliationHeaderCell>
            );
        }
        return (
            <TableHeaderCell key={column.id}>
                {column.label}
            </TableHeaderCell>
        );
    };

    const renderTableCell = (column: any, tr: TransactionResult) => {
        if (column.id === 'saleDate') {
            return <TableCellNoWrap key={column.id}>{tr.transaction.data.purchaseDetails.saleDate}</TableCellNoWrap>;
        }
        if (column.id === 'entitlementId') {
            return <TableCellNoWrap key={column.id}>{tr.transaction.entitlementId}</TableCellNoWrap>;
        }
        if (column.id === 'addonName') {
            return <StyledTableCell key={column.id}>{tr.transaction.data.addonName}</StyledTableCell>;
        }
        if (column.id === 'saleType') {
            return <StyledTableCell key={column.id}>{tr.transaction.data.purchaseDetails.saleType}</StyledTableCell>;
        }
        if (column.id === 'hosting') {
            return <StyledTableCell key={column.id}>{tr.transaction.data.purchaseDetails.hosting}</StyledTableCell>;
        }
        if (column.id === 'tier') {
            return (
                <StyledTableCell key={column.id}>
                    {tr.transaction.data.purchaseDetails.tier}
                    {tr.isSandbox && <EmphasizedAnnotation>Sandbox</EmphasizedAnnotation>}
                    {tr.transaction.data.purchaseDetails.discounts?.some(d => d.type==='MANUAL' && d.reason==='DUAL_LICENSING') && <EmphasizedAnnotation>Dual Licensing</EmphasizedAnnotation>}
                </StyledTableCell>
            );
        }
        if (column.id === 'company') {
            return (
                <StyledTableCell key={column.id}>
                    {tr.transaction.data.customerDetails.company}
                    {tr.isSandbox && tr.cloudSiteHostname &&<EmphasizedAnnotation>({tr.cloudSiteHostname})</EmphasizedAnnotation>}
                </StyledTableCell>
            );
        }
        if (column.id === 'amount') {
            return <StyledTableCell key={column.id} align="right">{formatCurrency(tr.transaction.data.purchaseDetails.vendorAmount)}</StyledTableCell>;
        }
        if (column.id === 'expectedAmount') {
            return <StyledTableCell key={column.id} align="right"><HighlightIfSignificantlyDifferent value={tr.transaction.reconcile?.expectedVendorAmount} compareToValue={tr.transaction.data.purchaseDetails.vendorAmount}/></StyledTableCell>;
        }
        if (column.id === 'discounts') {
            return (
                <StyledTableCell key={column.id} align="right">
                    {formatCurrency(sumDiscountArrayForTransaction({ data: tr.transaction.data }))}
                    {discountsToDescriptions(tr.transaction.data.purchaseDetails.discounts)}
                </StyledTableCell>
            );
        }
        if (column.id === 'maintenanceDays') {
            return <StyledTableCell key={column.id} align="right">{dateDiff(tr.transaction.data.purchaseDetails.maintenanceStartDate, tr.transaction.data.purchaseDetails.maintenanceEndDate)} days</StyledTableCell>;
        }
        if (column.id === 'maintenancePeriod') {
            return <StyledTableCell key={column.id}>{isoStringWithOnlyDate(tr.transaction.data.purchaseDetails.maintenanceStartDate) + ' - ' + isoStringWithOnlyDate(tr.transaction.data.purchaseDetails.maintenanceEndDate)}</StyledTableCell>;
        }
        if (column.id === 'createdAt') {
            return <TableCellNoWrap key={column.id}>{isoStringWithOnlyDate(tr.transaction.createdAt.toString())}</TableCellNoWrap>;
        }
        if (column.id === 'updatedAt') {
            return <TableCellNoWrap key={column.id}>{isoStringWithOnlyDate(tr.transaction.updatedAt.toString())}</TableCellNoWrap>;
        }
        if (column.id === 'versionCount') {
            return <StyledTableCell key={column.id}>{tr.versionCount}</StyledTableCell>;
        }
        if (column.id === 'reconciliation') {
            return (
                <StatusCell key={column.id} onClick={(e) => e.stopPropagation()}>
                    <ReconciliationControls
                        transaction={tr}
                        onQuickReconcile={handleQuickReconcile}
                        onShowDetails={setSelectedTransactionForReconcile}
                    />
                </StatusCell>
            );
        }
        return <StyledTableCell key={column.id}></StyledTableCell>;
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
                <FormControl size="small" sx={{ minWidth: 200 }}>
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
                <FormControl size="small" sx={{ minWidth: 200 }}>
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
                <FormControl size="small" sx={{ minWidth: 200 }}>
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
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SettingsIcon />}
                    onClick={() => setShowColumnConfig(true)}
                    sx={{ ml: 'auto', textTransform: 'none' }}
                >
                    Columns
                </Button>
            </SearchContainer>

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
                                    {visibleColumns.map((column) => renderTableHeader(column))}
                                </TableRow>
                            </StyledTableHead>
                            <StyledTableBody>
                                {transactions && transactions.length > 0 ? (
                                    transactions.map((tr) => (
                                        <StyledTableRow
                                            key={`${tr.transaction.id}`}
                                            onClick={() => setSelectedTransaction(tr)}
                                        >
                                            {visibleColumns.map((column) => renderTableCell(column, tr))}
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

const discountsToDescriptions = (discounts: TransactionDiscount[]|undefined) => {
    if (!discounts) return undefined;

    return (<>
        <EmphasizedAnnotation>
            {discounts.map(d => mapDiscountTypeToDescription(d)).join(', ')}
        </EmphasizedAnnotation>
    </>);
};