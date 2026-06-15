import React, { useState, useEffect } from 'react';
import {
    Box,
    TableRow,
    TablePagination,
    CircularProgress,
    Alert,
    Button,
    TextField,
    InputAdornment,
} from '@mui/material';
import { Settings as SettingsIcon, Search as SearchIcon } from '@mui/icons-material';
import { Quote } from '#common/types/marketplace.js';
import {
    StyledTableContainer,
    TableScrollWrapper,
    TableWrapper,
    TableContainer,
    StyledTable,
    StyledTableHead,
    StyledTableBody,
    PaginationWrapper,
    StyledTableRow,
    StyledListPaper,
    StyledTableCell,
    TableLoadingCell,
} from '../../components/styles';
import { TableWithMeasuredFooter } from '../../components/TableWithMeasuredFooter';
import { QuoteDetailsDialog } from './QuoteDetailsDialog';
import { ColumnConfigDialog } from '../../components/ColumnConfig';
import { useColumnConfig } from '../../components/useColumnConfig';
import { defaultQuoteColumns, QuoteCellContext, QuoteQuerySortType } from './quoteColumns';
import { renderHeader, renderCell } from '../../components/columnRenderHelpers';
import { ResponsiveSearchContainer } from '../../components/ResponsiveSearchContainer';
import { SortOrder } from '../../components/SortableHeader';
import { useSearchParamState } from '../../hooks/useSearchParamState';
import { quoteMatchesSearch } from './quoteSearchUtils';
import { sortQuotes } from './quoteSortUtils';

function getQuoteRowKey(globalIndex: number): string {
    return `quote-row-${globalIndex}`;
}

export const QuoteList: React.FC = () => {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
    const [showColumnConfig, setShowColumnConfig] = useState(false);
    const [search, setSearch] = useSearchParamState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sortBy, setSortBy] = useState<QuoteQuerySortType>(QuoteQuerySortType.CreatedDate);
    const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');

    const { columns, visibleColumns, updateColumns, isLoaded } = useColumnConfig(
        defaultQuoteColumns,
        'quote-column-config'
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search.trim());
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        setPage(0);
    }, [debouncedSearch]);

    useEffect(() => {
        const abortController = new AbortController();

        const loadQuotes = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/quotes', { signal: abortController.signal });
                const data = await response.json();
                if (!response.ok) {
                    setError(data.error ?? 'Failed to fetch quotes from Atlassian');
                    setQuotes([]);
                    return;
                }
                setQuotes(data.quotes ?? []);
                setPage(0);
            } catch (fetchError) {
                if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
                    return;
                }
                console.error('Error fetching quotes:', fetchError);
                setError('Failed to fetch quotes from Atlassian');
                setQuotes([]);
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        loadQuotes();
        return () => abortController.abort();
    }, []);

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
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

    const handleSort = (field: QuoteQuerySortType) => {
        if (field === sortBy) {
            setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
        } else {
            setSortBy(field);
            setSortOrder('DESC');
        }
        setPage(0);
    };

    const filteredQuotes = quotes.filter((quote) => quoteMatchesSearch(quote, debouncedSearch));
    const sortedQuotes = sortQuotes(filteredQuotes, sortBy, sortOrder);

    const paginatedQuotes = sortedQuotes.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    const cellContext: QuoteCellContext = {};

    return (
        <TableContainer>
            {error && (
                <Box sx={{ mb: 2 }}>
                    <Alert severity="error">{error}</Alert>
                </Box>
            )}

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
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />
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

            <TableWithMeasuredFooter
                table={
                    <TableScrollWrapper>
                        <TableWrapper>
                            <StyledTableContainer>
                                <StyledListPaper>
                                    <StyledTable>
                                        <StyledTableHead>
                                            <TableRow>
                                                {visibleColumns.map((column) =>
                                                    renderHeader(column, { sortBy, sortOrder, onSort: handleSort })
                                                )}
                                            </TableRow>
                                        </StyledTableHead>
                                        <StyledTableBody>
                                            {loading ? (
                                                <StyledTableRow>
                                                    <TableLoadingCell colSpan={visibleColumns.length || 1}>
                                                        <CircularProgress />
                                                    </TableLoadingCell>
                                                </StyledTableRow>
                                            ) : paginatedQuotes.length > 0 ? (
                                                paginatedQuotes.map((quote, index) => {
                                                    const globalIndex = page * rowsPerPage + index;
                                                    return (
                                                        <StyledTableRow
                                                            key={getQuoteRowKey(globalIndex)}
                                                            onClick={() => setSelectedQuote(quote)}
                                                        >
                                                            {visibleColumns.map((column) =>
                                                                renderCell(column, quote, cellContext)
                                                            )}
                                                        </StyledTableRow>
                                                    );
                                                })
                                            ) : (
                                                <StyledTableRow>
                                                    <StyledTableCell colSpan={visibleColumns.length || 1} align="center" sx={{ py: 4 }}>
                                                        {error ? 'Unable to load quotes' : debouncedSearch ? 'No quotes match your search' : 'No quotes found'}
                                                    </StyledTableCell>
                                                </StyledTableRow>
                                            )}
                                        </StyledTableBody>
                                    </StyledTable>
                                </StyledListPaper>
                            </StyledTableContainer>
                        </TableWrapper>
                    </TableScrollWrapper>
                }
                footer={
                    <PaginationWrapper>
                        <TablePagination
                            component="div"
                            count={sortedQuotes.length}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            rowsPerPageOptions={[10, 25, 50, 100]}
                        />
                    </PaginationWrapper>
                }
            />

            <QuoteDetailsDialog
                quote={selectedQuote}
                open={selectedQuote !== null}
                onClose={() => setSelectedQuote(null)}
            />

            <ColumnConfigDialog
                open={showColumnConfig}
                onClose={() => setShowColumnConfig(false)}
                columns={columns}
                onColumnsChange={updateColumns}
                title="Configure Quote Columns"
                isLoaded={isLoaded}
            />
        </TableContainer>
    );
};
