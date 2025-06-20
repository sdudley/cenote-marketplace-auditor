import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Table,
    TableBody,
    TableCell,
    TableRow,
    Button
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { TransactionVersion } from '#common/entities/TransactionVersion';
import {
    VersionDataBox,
    InfoTableBox,
    InfoTableHeader,
    VersionButton
} from '../../components/styles';
import { JsonDiffObjectTreeView } from '../../components/JsonDiffObjectTreeView';
import { getObjectDiff } from '#common/util/objectDiff';
import { CloseButton } from '../../components/CloseButton';
import { collectIdsForDiffObject } from '#client/util/collectIds';
import { isoStringWithDateAndTime } from '#common/util/dateUtils';
import { formatTransactionData } from './transactionUtils';
import { handleExportTransaction } from './util';

interface TransactionVersionDialogProps {
    version: TransactionVersion | null;
    priorVersion: TransactionVersion | null;
    open: boolean;
    onClose: () => void;
}

export const TransactionVersionDialog: React.FC<TransactionVersionDialogProps> = ({ version, priorVersion, open, onClose }) => {
    if (!version) return null;

    const formattedOld = priorVersion ? formatTransactionData(priorVersion.data) : undefined;
    const formattedNew = formatTransactionData(version.data);

    const jsonDiffObject = getObjectDiff(formattedOld, formattedNew);
    const allIds = collectIdsForDiffObject(jsonDiffObject);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
        >
            <DialogTitle>
                Transaction Version Details
                <VersionButton>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleExportTransaction( { transactionData: version.data, suffix: `v${version.version}` })}
                        sx={{ textTransform: 'none' }}
                    >
                        Export as JSON
                    </Button>
                </VersionButton>
                <CloseButton onClose={onClose} />
            </DialogTitle>
            <DialogContent dividers>
                <InfoTableBox>
                    <Table size="small">
                        <TableBody>
                            <TableRow>
                                <InfoTableHeader>Version</InfoTableHeader>
                                <TableCell>{version.version}</TableCell>
                                <InfoTableHeader>Created At</InfoTableHeader>
                                <TableCell>{isoStringWithDateAndTime(version.createdAt.toString())}</TableCell>
                            </TableRow>
                            <TableRow>
                                <InfoTableHeader>Entitlement ID</InfoTableHeader>
                                <TableCell>{version.entitlementId}</TableCell>
                                <InfoTableHeader>Changes</InfoTableHeader>
                                <TableCell>{version.diff || 'N/A'}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </InfoTableBox>

                <VersionDataBox>
                    <SimpleTreeView
                        slots={{
                            expandIcon: ExpandMore,
                            collapseIcon: ExpandLess
                        }}
                        defaultExpandedItems={allIds}
                    >
                        <JsonDiffObjectTreeView
                            data={jsonDiffObject}
                            humanizeKeys={true}
                            highlightNew={version.version !== 1}
                        />
                    </SimpleTreeView>
                </VersionDataBox>
            </DialogContent>
        </Dialog>
    );
};