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
import { LicenseResult } from '#common/types/apiTypes';
import { JsonTreeView } from '../../components/JsonTreeView';
import {
    InfoTableBox,
    InfoTableHeader,
    VersionButton
} from '../../components/styles';
import { collectIds } from '#client/util/collectIds';
import { CloseButton } from '../../components/CloseButton';
import { isoStringWithDateAndTime } from '#common/util/dateUtils';
import { LicenseVersionListDialog } from './LicenseVersionListDialog';
import { handleExportLicense } from './util';

interface LicenseDetailsProps {
    license: LicenseResult | null;
    open: boolean;
    onClose: () => void;
}

export const LicenseDetailsDialog: React.FC<LicenseDetailsProps> = ({ license, open, onClose }) => {
    const [showVersions, setShowVersions] = useState(false);

    if (!license) return null;

    // Format the license data
    const formattedData = license.license.data;
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
                    License Details
                    <VersionButton>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleExportLicense({ licenseData: license.license.data })}
                            sx={{ textTransform: 'none', marginRight: 1 }}
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
                    </VersionButton>
                    <CloseButton onClose={onClose} />
                </DialogTitle>
                <DialogContent dividers>
                    <InfoTableBox>
                        <Table size="small">
                            <TableBody>
                                <TableRow>
                                    <InfoTableHeader>Created At</InfoTableHeader>
                                    <TableCell>{isoStringWithDateAndTime(license.license.createdAt.toString())}</TableCell>
                                    <InfoTableHeader>Updated At</InfoTableHeader>
                                    <TableCell>{isoStringWithDateAndTime(license.license.updatedAt.toString())}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <InfoTableHeader>Entitlement ID</InfoTableHeader>
                                    <TableCell>{license.license.entitlementId}</TableCell>
                                    <InfoTableHeader>License Version</InfoTableHeader>
                                    <TableCell>
                                        <Link
                                            component="button"
                                            variant="body2"
                                            onClick={() => setShowVersions(true)}
                                            sx={{ textDecoration: 'none' }}
                                        >
                                            {license.license.currentVersion}
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

            <LicenseVersionListDialog
                open={showVersions}
                onClose={() => setShowVersions(false)}
                licenseResult={license}
            />
        </>
    );
};