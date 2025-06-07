import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableBody,
    TableCell,
    TableRow,
    IconButton,
    Typography,
    Box
} from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { ExpandMore, ExpandLess, Close as CloseIcon } from '@mui/icons-material';
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
import { JsonDiffObject, JsonDelta } from '../../../common/utils/objectDiff';
import { JsonTreeView } from '../JsonTreeView';
import { normalizeObject } from '#common/utils/objectUtils';

interface TransactionVersionDialogProps {
    version: TransactionVersion | null;
    priorVersion: TransactionVersion | null;
    open: boolean;
    onClose: () => void;
}

interface JsonObject { [key: string]: JsonValue }
type JsonArray = JsonValue[];
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;

const formatVersionData = (data: any): JsonObject => {
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

const collectIds = (obj: JsonDiffObject): string[] => {
    const ids: string[] = [];

    const processDiffObject = (diffObj: JsonDiffObject, parentKey: string = '') => {
        Object.entries(diffObj).forEach(([key, delta]) => {
            const fullKey = parentKey ? `${parentKey}.${key}` : key;
            ids.push(fullKey);

            if (delta.children) {
                processDiffObject(delta.children, fullKey);
            }
        });
    };

    processDiffObject(obj);
    return ids;
};

export const TransactionVersionDialog: React.FC<TransactionVersionDialogProps> = ({ version, priorVersion, open, onClose }) => {
    if (!version) return null;

    const formattedOld = priorVersion ? formatVersionData(priorVersion.data) : undefined;
    const formattedNew = formatVersionData(version.data);

    const jsonDiffObject = getObjectDiff(formattedOld, formattedNew);
    const allIds = collectIds(jsonDiffObject);

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
            <DialogTitle>
                Transaction Version Details
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                    }}
                >
                    <CloseIcon />
                </IconButton>
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
            <DialogActions>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};