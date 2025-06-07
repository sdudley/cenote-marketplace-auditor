import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Link,
    Table,
    TableBody,
    TableCell,
    TableRow
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { TransactionResult } from '#common/types/apiTypes';
import { isoStringWithOnlyDate } from '#common/utils/dateUtils';
import { formatCurrency } from '#common/utils/formatCurrency';
import { JsonTreeView } from '../JsonTreeView';
import { TransactionData } from '#common/types/marketplace.js';
import {
    DialogContentBox,
    InfoTableBox,
    InfoTableHeader
} from '../styles';
import { JsonObject, collectIds } from '../utils';
import { CloseButton } from '../CloseButton';

interface TransactionDetailsProps {
    transaction: TransactionResult | null;
    open: boolean;
    onClose: () => void;
}

const formatTransactionData = (data: TransactionData): JsonObject => {
    // Deep clone the data to avoid mutating the original
    const formattedData = structuredClone(data);

    // Format currency values in purchaseDetails
    if (formattedData.purchaseDetails && typeof formattedData.purchaseDetails === 'object') {
        const purchaseDetails = formattedData.purchaseDetails as JsonObject;
        if (typeof purchaseDetails.vendorAmount === 'number') {
            purchaseDetails.vendorAmount = formatCurrency(purchaseDetails.vendorAmount);
        }
        if (typeof purchaseDetails.purchasePrice === 'number') {
            purchaseDetails.purchasePrice = formatCurrency(purchaseDetails.purchasePrice);
        }
    }

    return formattedData;
};

export const TransactionDetailsDialog: React.FC<TransactionDetailsProps> = ({ transaction, open, onClose }) => {
    if (!transaction) return null;

    // Format the transaction data
    const formattedData = formatTransactionData(transaction.transaction.data);
    const allIds = collectIds(formattedData, 'root');

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
        >
            <DialogTitle>
                Transaction Details
                <CloseButton onClose={onClose} />
            </DialogTitle>
            <DialogContent dividers>
                <InfoTableBox>
                    <Table size="small">
                        <TableBody>
                            <TableRow>
                                <InfoTableHeader>Created At</InfoTableHeader>
                                <TableCell>{isoStringWithOnlyDate(transaction.transaction.createdAt.toString())}</TableCell>
                                <InfoTableHeader>Updated At</InfoTableHeader>
                                <TableCell>{isoStringWithOnlyDate(transaction.transaction.updatedAt.toString())}</TableCell>
                            </TableRow>
                            <TableRow>
                                <InfoTableHeader>Entitlement ID</InfoTableHeader>
                                <TableCell>
                                    {transaction.transaction.entitlementId ? (
                                        <Link href="#" underline="hover">
                                            {transaction.transaction.entitlementId}
                                        </Link>
                                    ) : (
                                        'N/A'
                                    )}
                                </TableCell>
                                <InfoTableHeader>Transaction Version</InfoTableHeader>
                                <TableCell>{transaction.transaction.currentVersion || 'N/A'}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </InfoTableBox>

                <Typography variant="h6" sx={{ mb: 2 }}>Transaction Data</Typography>
                <DialogContentBox>
                    <SimpleTreeView
                        slots={{expandIcon: ExpandMore, collapseIcon: ExpandLess}}
                        defaultExpandedItems={allIds}
                    >
                        <JsonTreeView data={formattedData} nodeId="root" />
                    </SimpleTreeView>
                </DialogContentBox>
            </DialogContent>
        </Dialog>
    );
};