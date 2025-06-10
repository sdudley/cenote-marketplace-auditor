import React, { useState, useEffect } from 'react';
import {
    TableRow,
    TablePagination,
    CircularProgress,
} from '@mui/material';
import { LicenseVersion } from '#common/entities/LicenseVersion';
import { isoStringWithOnlyDate } from '#common/utils/dateUtils';
import { StyledTableContainer, TableWrapper, LoadingOverlay, TableContainer, StyledTable, StyledTableHead, StyledTableBody, PaginationWrapper } from '../styles';
import { StyledTableRow, StyledListPaper, TableCellNoWrap, StyledTableCell, TableHeaderCell } from '../styles';

interface LicenseVersionListProps {
    licenseId: string;
}

export const LicenseVersionList: React.FC<LicenseVersionListProps> = ({ licenseId }) => {
    const [versions, setVersions] = useState<LicenseVersion[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [loading, setLoading] = useState(false);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/licenses/${licenseId}/versions?start=${page * rowsPerPage}&limit=${rowsPerPage}`
            );
            const data = await response.json();
            setVersions(data.versions);
            setTotal(data.total);
        } catch (error) {
            console.error('Error fetching license versions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVersions();
    }, [licenseId, page, rowsPerPage]);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <TableContainer>
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
                                    <TableHeaderCell>Version</TableHeaderCell>
                                    <TableHeaderCell>Created</TableHeaderCell>
                                    <TableHeaderCell>Updated</TableHeaderCell>
                                </TableRow>
                            </StyledTableHead>
                            <StyledTableBody>
                                {versions && versions.map((version) => (
                                    <StyledTableRow key={version.id}>
                                        <TableCellNoWrap>{version.version}</TableCellNoWrap>
                                        <TableCellNoWrap>{isoStringWithOnlyDate(version.createdAt.toString())}</TableCellNoWrap>
                                    </StyledTableRow>
                                ))}
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
        </TableContainer>
    );
};