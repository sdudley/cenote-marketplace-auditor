import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Table,
    TableBody,
    TableCell,
    TableRow
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { TransactionVersion } from '#common/entities/TransactionVersion';
import { formatCurrency } from '#common/utils/formatCurrency';
import {
    VersionDialogContentBox,
    VersionDataBox,
    VersionDataHeader,
    InfoTableBox,
    InfoTableHeader
} from '../styles';
import { JsonDiffObjectTreeView } from '../JsonDiffObjectTreeView';
import { getObjectDiff } from '#common/utils/objectDiff.js';
import { normalizeObject } from '#common/utils/objectUtils';
import { CloseButton } from '../CloseButton';
import { JsonObject, collectIdsForDiffObject } from '../utils';

interface TransactionVersionDialogProps {
    version: TransactionVersion | null;
    priorVersion: TransactionVersion | null;
    open: boolean;
    onClose: () => void;
}

const formatTransactionVersionData = (data: any): JsonObject => {
    // Deep clone the data to avoid mutating the original
    const formattedData = normalizeObject(structuredClone(data));

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

export const TransactionVersionDialog: React.FC<TransactionVersionDialogProps> = ({ version, priorVersion, open, onClose }) => {
    if (!version) return null;

    const formattedOld = priorVersion ? formatTransactionVersionData(priorVersion.data) : undefined;
    const formattedNew = formatTransactionVersionData(version.data);

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
                                <TableCell>{version.createdAt.toString().substring(0, 16).replace('T', ' ')}</TableCell>
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
                    <VersionDataHeader variant="h6">Version Information</VersionDataHeader>

                    <VersionDialogContentBox>
                        <SimpleTreeView
                            slots={{
                                expandIcon: ExpandMore,
                                collapseIcon: ExpandLess
                            }}
                            defaultExpandedItems={allIds}
                        >
                            <JsonDiffObjectTreeView data={jsonDiffObject} />
                        </SimpleTreeView>
                    </VersionDialogContentBox>
                </VersionDataBox>
            </DialogContent>
        </Dialog>
    );
};