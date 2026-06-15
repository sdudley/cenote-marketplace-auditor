import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Box,
    CircularProgress,
    Alert,
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { Quote, QuoteDetails } from '#common/types/marketplace.js';
import { JsonTreeView } from '../../components/JsonTreeView';
import {
    InfoTableBox,
    InfoTableHeader,
    TreeViewScrollContainer,
    TreeViewScrollContent,
    DialogLoadingBox,
} from '../../components/styles';
import { collectIds } from '#client/util/collectIds.js';
import { CloseButton } from '../../components/CloseButton';
import { isoStringWithOnlyDate } from '#common/util/dateUtils.js';
import { formatQuoteDetailsData } from './quoteUtils';

interface QuoteDetailsProps {
    quote: Quote | null;
    open: boolean;
    onClose: () => void;
}

export const QuoteDetailsDialog: React.FC<QuoteDetailsProps> = ({ quote, open, onClose }) => {
    const [details, setDetails] = useState<QuoteDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !quote?.quoteNumber) {
            setDetails(null);
            setError(null);
            setLoading(false);
            return;
        }

        const abortController = new AbortController();

        const loadQuoteDetails = async () => {
            setLoading(true);
            setError(null);
            setDetails(null);

            try {
                const params = new URLSearchParams({ quoteNumber: quote.quoteNumber! });
                if (quote.entitlementNumber) {
                    params.set('entitlementNumber', quote.entitlementNumber);
                }

                const response = await fetch(`/api/quotes/details?${params.toString()}`, {
                    signal: abortController.signal,
                });
                const data = await response.json();

                if (!response.ok) {
                    setError(typeof data?.error === 'string' ? data.error : 'Failed to load quote details');
                    return;
                }

                setDetails(data);
            } catch (fetchError) {
                if (fetchError instanceof DOMException && fetchError.name === 'AbortError') {
                    return;
                }
                console.error('Error fetching quote details:', fetchError);
                setError('Failed to load quote details');
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        loadQuoteDetails();
        return () => abortController.abort();
    }, [open, quote?.quoteNumber, quote?.entitlementNumber]);

    if (!quote) return null;

    const summary = details ?? quote;
    const formattedData = details ? formatQuoteDetailsData(details) : null;
    const allIds = formattedData ? collectIds(formattedData, 'root') : [];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
        >
            <DialogTitle sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                pr: { xs: 11, sm: 8 },
                position: 'relative'
            }}>
                <Box component="span" sx={{ flex: { xs: '1 1 100%', sm: 1 }, minWidth: 0 }}>
                    Quote Details
                </Box>
                <CloseButton onClose={onClose} />
            </DialogTitle>
            <DialogContent dividers>
                <InfoTableBox>
                    <Table size="small">
                        <TableBody>
                            <TableRow>
                                <InfoTableHeader>Quote Number</InfoTableHeader>
                                <TableCell>{summary.quoteNumber ?? ''}</TableCell>
                                <InfoTableHeader>Status</InfoTableHeader>
                                <TableCell>{summary.quoteStatus ?? ''}</TableCell>
                            </TableRow>
                            <TableRow>
                                <InfoTableHeader>Created Date</InfoTableHeader>
                                <TableCell>{summary.quoteCreatedDate ? isoStringWithOnlyDate(summary.quoteCreatedDate) : ''}</TableCell>
                                <InfoTableHeader>Expiry Date</InfoTableHeader>
                                <TableCell>{summary.quoteExpiryDate ? isoStringWithOnlyDate(summary.quoteExpiryDate) : ''}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </InfoTableBox>

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}

                <TreeViewScrollContainer>
                    <TreeViewScrollContent>
                        {loading ? (
                            <DialogLoadingBox>
                                <CircularProgress />
                            </DialogLoadingBox>
                        ) : formattedData ? (
                            <SimpleTreeView
                                slots={{ expandIcon: ExpandMore, collapseIcon: ExpandLess }}
                                defaultExpandedItems={allIds}
                            >
                                <JsonTreeView data={formattedData} nodeId="root" humanizeKeys={true} />
                            </SimpleTreeView>
                        ) : !error ? (
                            <DialogLoadingBox>No quote details available</DialogLoadingBox>
                        ) : null}
                    </TreeViewScrollContent>
                </TreeViewScrollContainer>
            </DialogContent>
        </Dialog>
    );
};
