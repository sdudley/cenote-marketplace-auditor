import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Box
} from '@mui/material';
import { LicenseResult } from '#common/types/apiTypes';
import { StyledDialog } from '../../components/styles';
import { LicenseVersionList } from './LicenseVersionList';
import { CloseButton } from '../../components/CloseButton';

interface LicenseVersionListDialogProps {
    licenseResult: LicenseResult | null;
    open: boolean;
    onClose: () => void;
}

export const LicenseVersionListDialog: React.FC<LicenseVersionListDialogProps> = ({
    licenseResult,
    open,
    onClose
}) => {
    if (!licenseResult) return null;

    const { data } = licenseResult.license;
    const { addonName, licenseType, hosting, tier, maintenanceStartDate, maintenanceEndDate, contactDetails } = data;
    const { company } = contactDetails;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="h6">License Versions</Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        {addonName} • {licenseType} • {hosting} • {tier} • {maintenanceStartDate}-{maintenanceEndDate} • {company}
                    </Typography>
                </Box>
                <CloseButton onClose={onClose} />
            </DialogTitle>
            <DialogContent>
                <StyledDialog>
                    <LicenseVersionList licenseId={licenseResult.license.id} />
                </StyledDialog>
            </DialogContent>
        </Dialog>
    );
};