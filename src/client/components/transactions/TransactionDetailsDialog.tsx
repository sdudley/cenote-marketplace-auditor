import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Link,
    Table,
    TableBody,
    TableCell,
    TableRow
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { TransactionResult } from '#common/types/apiTypes';
import { JsonTreeView } from '../JsonTreeView';
import {
    InfoTableBox,
    InfoTableHeader
} from '../styles';
import { collectIds } from '../utils';
import { CloseButton } from '../CloseButton';
import { isoStringWithDateAndTime } from '#common/utils/dateUtils';
import { formatTransactionData } from './transactionUtils';

interface TransactionDetailsProps {
    transaction: TransactionResult | null;
    open: boolean;
    onClose: () => void;
}

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
                                <TableCell>{isoStringWithDateAndTime(transaction.transaction.createdAt.toString())}</TableCell>
                                <InfoTableHeader>Updated At</InfoTableHeader>
                                <TableCell>{isoStringWithDateAndTime(transaction.transaction.updatedAt.toString())}</TableCell>
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

                <SimpleTreeView
                    slots={{expandIcon: ExpandMore, collapseIcon: ExpandLess}}
                    defaultExpandedItems={allIds}
                >
                    <JsonTreeView data={formattedData} nodeId="root" />
                </SimpleTreeView>
            </DialogContent>
        </Dialog>
    );
};