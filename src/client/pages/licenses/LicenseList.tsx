import React, { useState, useEffect } from 'react';
import {
    TableRow,
    TablePagination,
    TextField,
    CircularProgress,
    InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { LicenseQuerySortType, LicenseResult } from '#common/types/apiTypes';
import { dateDiff, isoStringWithOnlyDate } from '#common/util/dateUtils';
import { StyledTableContainer, TableWrapper, SearchContainer, LoadingOverlay, TableContainer, StyledTable, StyledTableHead, StyledTableBody, PaginationWrapper } from '../../components/styles';
import { LicenseDetailsDialog } from './LicenseDetailsDialog';
import { SortOrder, SortableHeader } from '../../components/SortableHeader';
import { StyledTableRow, StyledListPaper, TableCellNoWrap, StyledTableCell, TableHeaderCell, WrappedLabel } from '../../components/styles';
import { EmphasizedAnnotation } from '../../components/styles';

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

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const fetchLicenses = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/licenses?start=${page * rowsPerPage}&limit=${rowsPerPage}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${encodeURIComponent(debouncedSearch)}`
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
    }, [page, rowsPerPage, sortBy, sortOrder, debouncedSearch]);

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
                                    <TableHeaderCell>Entitlement ID</TableHeaderCell>
                                    <TableHeaderCell>App</TableHeaderCell>
                                    <TableHeaderCell>License Type</TableHeaderCell>
                                    <TableHeaderCell>Status</TableHeaderCell>
                                    <TableHeaderCell>Hosting</TableHeaderCell>
                                    <TableHeaderCell>Tier</TableHeaderCell>
                                    <TableHeaderCell>Company</TableHeaderCell>
                                    <SortableHeader<LicenseQuerySortType>
                                        field={LicenseQuerySortType.MaintenanceDays}
                                        label={<WrappedLabel>Maintenance<br/>Days</WrappedLabel>}
                                        currentSort={sortBy}
                                        currentOrder={sortOrder}
                                        onSort={handleSort}
                                        whiteSpace
                                        align="right"
                                    />
                                    <SortableHeader<LicenseQuerySortType>
                                        field={LicenseQuerySortType.MaintenanceStartDate}
                                        label={<WrappedLabel>Maintenance<br/>Start</WrappedLabel>}
                                        currentSort={sortBy}
                                        currentOrder={sortOrder}
                                        onSort={handleSort}
                                        whiteSpace
                                    />
                                    <SortableHeader<LicenseQuerySortType>
                                        field={LicenseQuerySortType.MaintenanceEndDate}
                                        label={<WrappedLabel>Maintenance<br/>End</WrappedLabel>}
                                        currentSort={sortBy}
                                        currentOrder={sortOrder}
                                        onSort={handleSort}
                                        whiteSpace
                                    />
                                    <SortableHeader<LicenseQuerySortType>
                                        field={LicenseQuerySortType.GracePeriod}
                                        label={<WrappedLabel>Grace<br/>Period</WrappedLabel>}
                                        currentSort={sortBy}
                                        currentOrder={sortOrder}
                                        onSort={handleSort}
                                        whiteSpace
                                    />
                                    <SortableHeader<LicenseQuerySortType>
                                        field={LicenseQuerySortType.CreatedAt}
                                        label="Created"
                                        currentSort={sortBy}
                                        currentOrder={sortOrder}
                                        onSort={handleSort}
                                        whiteSpace
                                        tooltip="The first time the license was downloaded to this app"
                                    />
                                    <SortableHeader<LicenseQuerySortType>
                                        field={LicenseQuerySortType.UpdatedAt}
                                        label="Updated"
                                        currentSort={sortBy}
                                        currentOrder={sortOrder}
                                        onSort={handleSort}
                                        whiteSpace
                                        tooltip="The last time a new version of this license was detected by this app"
                                    />
                                    <SortableHeader<LicenseQuerySortType>
                                        field={LicenseQuerySortType.AtlassianLastUpdated}
                                        label={<WrappedLabel>Atlassian<br/>Last Updated</WrappedLabel>}
                                        currentSort={sortBy}
                                        currentOrder={sortOrder}
                                        onSort={handleSort}
                                        whiteSpace
                                        tooltip="The last time Atlassian claims the license was updated"
                                    />
                                    <SortableHeader<LicenseQuerySortType>
                                        field={LicenseQuerySortType.VersionCount}
                                        label="Versions"
                                        currentSort={sortBy}
                                        currentOrder={sortOrder}
                                        onSort={handleSort}
                                        whiteSpace
                                        tooltip="The number of historical versions of this license that have been stored"
                                    />
                                </TableRow>
                            </StyledTableHead>
                            <StyledTableBody>
                                {licenses && licenses.length > 0 ? (
                                    licenses.map((license) => (
                                        <StyledTableRow
                                            key={`${license.license.id}`}
                                            onClick={() => setSelectedLicense(license)}
                                        >
                                            <TableCellNoWrap>{license.license.entitlementId}</TableCellNoWrap>
                                            <StyledTableCell>{license.license.data.addonName}</StyledTableCell>
                                            <StyledTableCell>{toMixedCase(license.license.data.licenseType)}{license.license.data.installedOnSandbox==='Yes' && <EmphasizedAnnotation>(Sandbox)</EmphasizedAnnotation>}</StyledTableCell>
                                            <StyledTableCell>{toMixedCase(license.license.data.status)}</StyledTableCell>
                                            <StyledTableCell>{license.license.data.hosting}</StyledTableCell>
                                            <StyledTableCell>{license.license.data.tier + (license.license.data.tier==='Evaluation' && license.license.data.evaluationOpportunitySize && license.license.data.evaluationOpportunitySize !== 'Evaluation' ? ` (${license.license.data.evaluationOpportunitySize})` : '')}</StyledTableCell>
                                            <StyledTableCell>{license.license.data.contactDetails.company}</StyledTableCell>
                                            <StyledTableCell align="right">{license.license.data.maintenanceEndDate ? dateDiff(license.license.data.maintenanceStartDate, license.license.data.maintenanceEndDate) : '?'} days</StyledTableCell>
                                            <TableCellNoWrap>{license.license.data.maintenanceStartDate}</TableCellNoWrap>
                                            <TableCellNoWrap>{license.license.data.maintenanceEndDate}</TableCellNoWrap>
                                            <TableCellNoWrap>{license.license.data.inGracePeriod ?? 'No'}</TableCellNoWrap>
                                            <TableCellNoWrap>{isoStringWithOnlyDate(license.license.createdAt.toString())}</TableCellNoWrap>
                                            <TableCellNoWrap>{isoStringWithOnlyDate(license.license.updatedAt.toString())}</TableCellNoWrap>
                                            <TableCellNoWrap>{isoStringWithOnlyDate(license.license.data.lastUpdated)}</TableCellNoWrap>
                                            <TableCellNoWrap>{license.versionCount}</TableCellNoWrap>
                                        </StyledTableRow>
                                    ))
                                ) : ( !loading &&
                                    <StyledTableRow>
                                        <StyledTableCell colSpan={13} align="center" sx={{ py: 4 }}>
                                            No licenses. Please configure the application through the Configuration page, then start all tasks on the Tasks page.
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
        </TableContainer>
    );
};