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
import { LicenseVersion } from '#common/entities/LicenseVersion';
import {
    VersionDataBox,
    InfoTableBox,
    InfoTableHeader
} from '../../components/styles';
import { JsonDiffObjectTreeView } from '../../components/JsonDiffObjectTreeView';
import { getObjectDiff } from '#common/util/objectDiff';
import { CloseButton } from '../../components/CloseButton';
import { collectIdsForDiffObject } from '#client/util/collectIds';
import { isoStringWithDateAndTime } from '#common/util/dateUtils';

interface LicenseVersionDialogProps {
    version: LicenseVersion | null;
    priorVersion: LicenseVersion | null;
    open: boolean;
    onClose: () => void;
}

export const LicenseVersionDialog: React.FC<LicenseVersionDialogProps> = ({ version, priorVersion, open, onClose }) => {
    if (!version) return null;

    const jsonDiffObject = getObjectDiff(priorVersion?.data, version.data);
    const allIds = collectIdsForDiffObject(jsonDiffObject);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
        >
            <DialogTitle>
                License Version Details
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
                        <JsonDiffObjectTreeView data={jsonDiffObject} />
                    </SimpleTreeView>
                </VersionDataBox>
            </DialogContent>
        </Dialog>
    );
};