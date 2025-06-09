import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Link,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Button
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { TransactionResult } from '#common/types/apiTypes';
import { JsonTreeView } from '../JsonTreeView';
import {
    InfoTableBox,
    InfoTableHeader,
    VersionButton
} from '../styles';
import { collectIds } from '../utils';
import { CloseButton } from '../CloseButton';
import { isoStringWithDateAndTime } from '#common/utils/dateUtils';
import { formatTransactionData } from './transactionUtils';
import { TransactionVersionListDialog } from './TransactionVersionListDialog';

interface TransactionDetailsProps {
    transaction: TransactionResult | null;
    open: boolean;
    onClose: () => void;
}

export const TransactionDetailsDialog: React.FC<TransactionDetailsProps> = ({ transaction, open, onClose }) => {
    const [showVersions, setShowVersions] = useState(false);

    if (!transaction) return null;

    // Format the transaction data
    const formattedData = formatTransactionData(transaction.transaction.data);
    const allIds = collectIds(formattedData, 'root');

    return (
        <>
            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    Transaction Details
                    <VersionButton>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setShowVersions(true)}
                            sx={{ textTransform: 'none' }}
                        >
                            Show all versions
                        </Button>
                    </VersionButton>
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
                                    <TableCell>{transaction.transaction.entitlementId}</TableCell>
                                    <InfoTableHeader>Transaction Version</InfoTableHeader>
                                    <TableCell>
                                        <Link
                                            component="button"
                                            variant="body2"
                                            onClick={() => setShowVersions(true)}
                                            sx={{ textDecoration: 'none' }}
                                        >
                                            {transaction.transaction.currentVersion}
                                        </Link>
                                    </TableCell>
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

            <TransactionVersionListDialog
                open={showVersions}
                onClose={() => setShowVersions(false)}
                transactionResult={transaction}
            />
        </>
    );
};