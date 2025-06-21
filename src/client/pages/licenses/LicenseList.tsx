import React, { useState, useEffect } from 'react';
import {
    TableRow,
    TablePagination,
    TextField,
    CircularProgress,
    InputAdornment,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    OutlinedInput,
    Checkbox,
    ListItemText,
    Button,
} from '@mui/material';
import { Search as SearchIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { LicenseQuerySortType, LicenseResult, AppInfo } from '#common/types/apiTypes';
import { dateDiff, isoStringWithOnlyDate } from '#common/util/dateUtils';
import { StyledTableContainer, TableWrapper, SearchContainer, LoadingOverlay, TableContainer, StyledTable, StyledTableHead, StyledTableBody, PaginationWrapper, FilterLabel } from '../../components/styles';
import { LicenseDetailsDialog } from './LicenseDetailsDialog';
import { SortOrder, SortableHeader } from '../../components/SortableHeader';
import { StyledTableRow, StyledListPaper, TableCellNoWrap, StyledTableCell, TableHeaderCell, WrappedLabel } from '../../components/styles';
import { EmphasizedAnnotation } from '../../components/styles';
import { ColumnConfigDialog } from '../../components/ColumnConfig';
import { useColumnConfig } from '../../components/useColumnConfig';
import { defaultLicenseColumns } from './licenseColumns';

interface LicenseListProps {
    // Add props if needed
}

const toMixedCase = (str: string) => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
};

export const LicenseList: React.FC<LicenseListProps> = () => {
    const [licenses, setLicenses] = useState<LicenseResult[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [sortBy, setSortBy] = useState<LicenseQuerySortType>(LicenseQuerySortType.AtlassianLastUpdated);
    const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedLicense, setSelectedLicense] = useState<LicenseResult | null>(null);
    const [hostingFilter, setHostingFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [appFilter, setAppFilter] = useState<string>('');
    const [licenseTypeFilter, setLicenseTypeFilter] = useState<string[]>([]);
    const [apps, setApps] = useState<AppInfo[]>([]);
    const [loadingApps, setLoadingApps] = useState(false);
    const [showColumnConfig, setShowColumnConfig] = useState(false);

    const { columns, visibleColumns, updateColumns, isLoaded } = useColumnConfig(
        defaultLicenseColumns,
        'license-column-config'
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

    const fetchLicenses = async () => {
        setLoading(true);
        try {
            const hostingParam = hostingFilter ? `&hosting=${encodeURIComponent(hostingFilter)}` : '';
            const statusParam = statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : '';
            const appParam = appFilter ? `&addonKey=${encodeURIComponent(appFilter)}` : '';
            const licenseTypeParam = licenseTypeFilter.length > 0 ? licenseTypeFilter.map(type => `&licenseType=${encodeURIComponent(type)}`).join('') : '';
            const response = await fetch(
                `/api/licenses?start=${page * rowsPerPage}&limit=${rowsPerPage}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${encodeURIComponent(debouncedSearch)}${hostingParam}${statusParam}${appParam}${licenseTypeParam}`
            );
            const data = await response.json();
            setLicenses(data.licenses);
            setTotal(data.total);
        } catch (error) {
            console.error('Error fetching licenses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLicenses();
    }, [page, rowsPerPage, sortBy, sortOrder, debouncedSearch, hostingFilter, statusFilter, appFilter, licenseTypeFilter]);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSort = (field: LicenseQuerySortType) => {
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

    const handleHostingFilterChange = (event: any) => {
        setHostingFilter(event.target.value as string);
        setPage(0); // Reset to first page when filter changes
    };

    const handleStatusFilterChange = (event: any) => {
        setStatusFilter(event.target.value as string);
        setPage(0); // Reset to first page when filter changes
    };

    const handleAppFilterChange = (event: any) => {
        setAppFilter(event.target.value as string);
        setPage(0); // Reset to first page when filter changes
    };

    const handleLicenseTypeFilterChange = (event: any) => {
        const selected = event.target.value as string[];
        setLicenseTypeFilter(selected);
        setPage(0); // Reset to first page when filter changes
    };

    const renderTableHeader = (column: any) => {
        if (column.sortable && column.sortField) {
            return (
                <SortableHeader<LicenseQuerySortType>
                    key={column.id}
                    field={column.sortField}
                    label={column.label}
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                    whiteSpace
                    align={column.align}
                    tooltip={column.tooltip}
                />
            );
        }
        return (
            <TableHeaderCell key={column.id} align={column.align}>
                {column.label}
            </TableHeaderCell>
        );
    };

    const renderTableCell = (column: any, license: LicenseResult) => {
        if (column.id === 'entitlementId') {
            return <TableCellNoWrap key={column.id}>{license.license.entitlementId}</TableCellNoWrap>;
        }
        if (column.id === 'app') {
            return <StyledTableCell key={column.id}>{license.license.data.addonName}</StyledTableCell>;
        }
        if (column.id === 'licenseType') {
            return (
                <StyledTableCell key={column.id}>
                    {toMixedCase(license.license.data.licenseType)}
                    {license.license.data.installedOnSandbox === 'Yes' && <EmphasizedAnnotation>(Sandbox)</EmphasizedAnnotation>}
                </StyledTableCell>
            );
        }
        if (column.id === 'status') {
            return <StyledTableCell key={column.id}>{toMixedCase(license.license.data.status)}</StyledTableCell>;
        }
        if (column.id === 'hosting') {
            return <StyledTableCell key={column.id}>{license.license.data.hosting}</StyledTableCell>;
        }
        if (column.id === 'tier') {
            return (
                <StyledTableCell key={column.id}>
                    {license.license.data.tier + (license.license.data.tier === 'Evaluation' && license.license.data.evaluationOpportunitySize && license.license.data.evaluationOpportunitySize !== 'Evaluation' ? ` (${license.license.data.evaluationOpportunitySize})` : '')}
                </StyledTableCell>
            );
        }
        if (column.id === 'company') {
            return <StyledTableCell key={column.id}>{license.license.data.contactDetails.company}</StyledTableCell>;
        }
        if (column.id === 'maintenanceDays') {
            return (
                <StyledTableCell key={column.id} align="right">
                    {license.license.data.maintenanceEndDate ? dateDiff(license.license.data.maintenanceStartDate, license.license.data.maintenanceEndDate) : '?'} days
                </StyledTableCell>
            );
        }
        if (column.id === 'maintenanceStartDate') {
            return <TableCellNoWrap key={column.id}>{license.license.data.maintenanceStartDate}</TableCellNoWrap>;
        }
        if (column.id === 'maintenanceEndDate') {
            return <TableCellNoWrap key={column.id}>{license.license.data.maintenanceEndDate}</TableCellNoWrap>;
        }
        if (column.id === 'gracePeriod') {
            return <TableCellNoWrap key={column.id}>{license.license.data.inGracePeriod ?? 'No'}</TableCellNoWrap>;
        }
        if (column.id === 'createdAt') {
            return <TableCellNoWrap key={column.id}>{isoStringWithOnlyDate(license.license.createdAt.toString())}</TableCellNoWrap>;
        }
        if (column.id === 'updatedAt') {
            return <TableCellNoWrap key={column.id}>{isoStringWithOnlyDate(license.license.updatedAt.toString())}</TableCellNoWrap>;
        }
        if (column.id === 'atlassianLastUpdated') {
            return <TableCellNoWrap key={column.id}>{isoStringWithOnlyDate(license.license.data.lastUpdated)}</TableCellNoWrap>;
        }
        if (column.id === 'versionCount') {
            return <StyledTableCell key={column.id}>{license.versionCount}</StyledTableCell>;
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
                    <InputLabel>License Type</InputLabel>
                    <Select
                        multiple
                        value={licenseTypeFilter}
                        label="License Type"
                        onChange={handleLicenseTypeFilterChange}
                        input={<OutlinedInput label="License Type" />}
                        renderValue={(selected) => {
                            if ((selected as string[]).length === 0) {
                                return 'All License Types';
                            }
                            return `${(selected as string[]).length} selected`;
                        }}
                    >
                        <MenuItem value="ACADEMIC">
                            <Checkbox checked={licenseTypeFilter.indexOf('ACADEMIC') > -1} />
                            <ListItemText primary="Academic" />
                        </MenuItem>
                        <MenuItem value="COMMERCIAL">
                            <Checkbox checked={licenseTypeFilter.indexOf('COMMERCIAL') > -1} />
                            <ListItemText primary="Commercial" />
                        </MenuItem>
                        <MenuItem value="COMMUNITY">
                            <Checkbox checked={licenseTypeFilter.indexOf('COMMUNITY') > -1} />
                            <ListItemText primary="Community" />
                        </MenuItem>
                        <MenuItem value="DEMONSTRATION">
                            <Checkbox checked={licenseTypeFilter.indexOf('DEMONSTRATION') > -1} />
                            <ListItemText primary="Demonstration" />
                        </MenuItem>
                        <MenuItem value="EVALUATION">
                            <Checkbox checked={licenseTypeFilter.indexOf('EVALUATION') > -1} />
                            <ListItemText primary="Evaluation" />
                        </MenuItem>
                        <MenuItem value="FREE">
                            <Checkbox checked={licenseTypeFilter.indexOf('FREE') > -1} />
                            <ListItemText primary="Free" />
                        </MenuItem>
                        <MenuItem value="NON_COMMERCIAL">
                            <Checkbox checked={licenseTypeFilter.indexOf('NON_COMMERCIAL') > -1} />
                            <ListItemText primary="Non-Commercial" />
                        </MenuItem>
                        <MenuItem value="OPEN_SOURCE">
                            <Checkbox checked={licenseTypeFilter.indexOf('OPEN_SOURCE') > -1} />
                            <ListItemText primary="Open Source" />
                        </MenuItem>
                        <MenuItem value="PERSONAL">
                            <Checkbox checked={licenseTypeFilter.indexOf('PERSONAL') > -1} />
                            <ListItemText primary="Personal" />
                        </MenuItem>
                        <MenuItem value="CLASSROOM">
                            <Checkbox checked={licenseTypeFilter.indexOf('CLASSROOM') > -1} />
                            <ListItemText primary="Classroom" />
                        </MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={statusFilter}
                        label="Status"
                        onChange={handleStatusFilterChange}
                    >
                        <MenuItem value="">All Statuses</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
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
                                {licenses && licenses.length > 0 ? (
                                    licenses.map((license) => (
                                        <StyledTableRow
                                            key={`${license.license.id}`}
                                            onClick={() => setSelectedLicense(license)}
                                        >
                                            {visibleColumns.map((column) => renderTableCell(column, license))}
                                        </StyledTableRow>
                                    ))
                                ) : ( !loading &&
                                    <StyledTableRow>
                                        <StyledTableCell colSpan={visibleColumns.length} align="center" sx={{ py: 4 }}>
                                            No licenses found.
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

            <LicenseDetailsDialog
                license={selectedLicense}
                open={!!selectedLicense}
                onClose={() => setSelectedLicense(null)}
            />

            <ColumnConfigDialog
                open={showColumnConfig}
                onClose={() => setShowColumnConfig(false)}
                columns={columns}
                onColumnsChange={updateColumns}
                title="Configure License Columns"
                isLoaded={isLoaded}
            />
        </TableContainer>
    );
};