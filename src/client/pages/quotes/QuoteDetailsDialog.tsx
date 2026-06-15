import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Box
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { Quote } from '#common/types/marketplace.js';
import { JsonTreeView } from '../../components/JsonTreeView';
import {
    InfoTableBox,
    InfoTableHeader,
    TreeViewScrollContainer,
    TreeViewScrollContent
} from '../../components/styles';
import { collectIds } from '#client/util/collectIds.js';
import { CloseButton } from '../../components/CloseButton';
import { isoStringWithOnlyDate } from '#common/util/dateUtils.js';

interface QuoteDetailsProps {
    quote: Quote | null;
    open: boolean;
    onClose: () => void;
}

export const QuoteDetailsDialog: React.FC<QuoteDetailsProps> = ({ quote, open, onClose }) => {
    if (!quote) return null;

    const allIds = collectIds(quote, 'root');

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
                                <TableCell>{quote.quoteNumber ?? ''}</TableCell>
                                <InfoTableHeader>Status</InfoTableHeader>
                                <TableCell>{quote.quoteStatus ?? ''}</TableCell>
                            </TableRow>
                            <TableRow>
                                <InfoTableHeader>Created Date</InfoTableHeader>
                                <TableCell>{quote.quoteCreatedDate ? isoStringWithOnlyDate(quote.quoteCreatedDate) : ''}</TableCell>
                                <InfoTableHeader>Expiry Date</InfoTableHeader>
                                <TableCell>{quote.quoteExpiryDate ? isoStringWithOnlyDate(quote.quoteExpiryDate) : ''}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </InfoTableBox>

                <TreeViewScrollContainer>
                    <TreeViewScrollContent>
                        <SimpleTreeView
                            slots={{ expandIcon: ExpandMore, collapseIcon: ExpandLess }}
                            defaultExpandedItems={allIds}
                        >
                            <JsonTreeView data={quote} nodeId="root" humanizeKeys={true} />
                        </SimpleTreeView>
                    </TreeViewScrollContent>
                </TreeViewScrollContainer>
            </DialogContent>
        </Dialog>
    );
};
