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
    Button,
    Box
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { TransactionResult } from '#common/types/apiTypes';
import { JsonTreeView } from '../../components/JsonTreeView';
import {
    InfoTableBox,
    InfoTableHeader,
    TreeViewScrollContainer,
    TreeViewScrollContent
} from '../../components/styles';
import { collectIds } from '#client/util/collectIds';
import { CloseButton } from '../../components/CloseButton';
import { isoStringWithDateAndTime } from '#common/util/dateUtils';
import { formatTransactionData } from './transactionUtils';
import { TransactionVersionListDialog } from './TransactionVersionListDialog';
import { handleExportTransaction } from './util';

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
                        Transaction Details
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleExportTransaction({ transactionData: transaction.transaction.data })}
                            sx={{ textTransform: 'none' }}
                        >
                            Export as JSON
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setShowVersions(true)}
                            sx={{ textTransform: 'none' }}
                        >
                            Show all versions
                        </Button>
                    </Box>
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

                    <TreeViewScrollContainer>
                        <TreeViewScrollContent>
                            <SimpleTreeView
                                slots={{expandIcon: ExpandMore, collapseIcon: ExpandLess}}
                                defaultExpandedItems={allIds}
                            >
                                <JsonTreeView data={formattedData} nodeId="root" humanizeKeys={true} />
                            </SimpleTreeView>
                        </TreeViewScrollContent>
                    </TreeViewScrollContainer>
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