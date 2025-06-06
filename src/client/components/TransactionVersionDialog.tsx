import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableRow
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { TransactionVersion } from '#common/entities/TransactionVersion';
import { formatCurrency } from '#common/utils/formatCurrency';
import { JsonTreeView } from './JsonTreeView';
import {
    VersionDialogContentBox,
    VersionDataBox,
    VersionDataHeader,
    InfoTableBox,
    InfoTableHeader
} from './styles';

interface TransactionVersionDialogProps {
    version: TransactionVersion | null;
    open: boolean;
    onClose: () => void;
}

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject { [key: string]: JsonValue }
type JsonArray = JsonValue[];

const formatVersionData = (data: any): JsonObject => {
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

export const TransactionVersionDialog: React.FC<TransactionVersionDialogProps> = ({ version, open, onClose }) => {
    if (!version) return null;

    // Collect all node IDs
    const collectIds = (obj: JsonValue, nodeId: string = ''): string[] => {
        if (!obj || typeof obj !== 'object') return [nodeId];
        return [nodeId, ...Object.entries(obj as JsonObject).flatMap(([key, value]) =>
            collectIds(value, nodeId ? `${nodeId}.${key}` : key)
        )];
    };

    // Format the version data
    const formattedData = formatVersionData(version.data);
    const allIds = collectIds(formattedData, 'root');

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    minHeight: '80vh',
                    maxHeight: '90vh'
                }
            }}
        >
            <DialogTitle>Transaction Version Details</DialogTitle>
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
                    <VersionDataHeader variant="h6">Version Data</VersionDataHeader>
                    <VersionDialogContentBox>
                        <SimpleTreeView
                            slots={{
                                expandIcon: ExpandMore,
                                collapseIcon: ExpandLess
                            }}
                            defaultExpandedItems={allIds}
                        >
                            <JsonTreeView data={formattedData} nodeId="root" />
                        </SimpleTreeView>
                    </VersionDialogContentBox>
                </VersionDataBox>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};