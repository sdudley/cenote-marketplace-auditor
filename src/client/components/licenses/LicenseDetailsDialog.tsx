import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Grid,
    Box,
} from '@mui/material';
import { LicenseResult } from '#common/types/apiTypes';
import { isoStringWithOnlyDate } from '#common/utils/dateUtils';
import { LicenseVersionListDialog } from './LicenseVersionListDialog';

interface LicenseDetailsDialogProps {
    license: LicenseResult | null;
    open: boolean;
    onClose: () => void;
}

export const LicenseDetailsDialog: React.FC<LicenseDetailsDialogProps> = ({
    license,
    open,
    onClose,
}) => {
    const [showVersions, setShowVersions] = React.useState(false);

    if (!license) {
        return null;
    }

    const { data } = license.license;

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle>License Details</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="h6">Basic Information</Typography>
                            <Box mt={1}>
                                <Typography><strong>Entitlement ID:</strong> {license.license.entitlementId}</Typography>
                                <Typography><strong>App:</strong> {data.addonName}</Typography>
                                <Typography><strong>License Type:</strong> {data.licenseType}</Typography>
                                <Typography><strong>Hosting:</strong> {data.hosting}</Typography>
                                <Typography><strong>Tier:</strong> {data.tier}</Typography>
                            </Box>
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="h6">Contact Details</Typography>
                            <Box mt={1}>
                                <Typography><strong>Company:</strong> {data.contactDetails.company}</Typography>
                                <Typography><strong>Name:</strong> {data.contactDetails.name}</Typography>
                                <Typography><strong>Email:</strong> {data.contactDetails.email}</Typography>
                            </Box>
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="h6">Dates</Typography>
                            <Box mt={1}>
                                <Typography><strong>Maintenance Start:</strong> {data.maintenanceStartDate}</Typography>
                                <Typography><strong>Maintenance End:</strong> {data.maintenanceEndDate}</Typography>
                                <Typography><strong>Created:</strong> {isoStringWithOnlyDate(license.license.createdAt.toString())}</Typography>
                                <Typography><strong>Updated:</strong> {isoStringWithOnlyDate(license.license.updatedAt.toString())}</Typography>
                            </Box>
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="h6">Additional Information</Typography>
                            <Box mt={1}>
                                <Typography><strong>Version Count:</strong> {license.versionCount}</Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowVersions(true)} color="primary">
                        View Versions
                    </Button>
                    <Button onClick={onClose} color="primary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <LicenseVersionListDialog
                licenseId={license.license.id}
                open={showVersions}
                onClose={() => setShowVersions(false)}
            />
        </>
    );
};