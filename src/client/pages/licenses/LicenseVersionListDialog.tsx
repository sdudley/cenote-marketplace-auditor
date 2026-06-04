import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Box
} from '@mui/material';
import { LicenseResult } from '#common/types/apiTypes.js';
import { StyledDialog } from '../../components/styles';
import { LicenseVersionList, LicenseVersionSource } from './LicenseVersionList';
import { CloseButton } from '../../components/CloseButton';

interface LicenseVersionListDialogProps {
    licenseResult: LicenseResult | null;
    open: boolean;
    onClose: () => void;
    source?: LicenseVersionSource;
}

export const LicenseVersionListDialog: React.FC<LicenseVersionListDialogProps> = ({
    licenseResult,
    open,
    onClose,
    source = 'database'
}) => {
    if (!licenseResult) return null;

    const { data } = licenseResult.license;
    const { addonName, licenseType, hosting, tier, maintenanceStartDate, maintenanceEndDate, contactDetails } = data;
    const { company } = contactDetails;
    const sourceLabel = source === 'atlassian' ? 'Atlassian' : 'dB';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="h6">License Versions ({sourceLabel})</Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        {addonName} • {licenseType} • {hosting} • {tier} • {maintenanceStartDate}-{maintenanceEndDate} • {company}
                    </Typography>
                </Box>
                <CloseButton onClose={onClose} />
            </DialogTitle>
            <DialogContent>
                <StyledDialog>
                    <LicenseVersionList licenseId={licenseResult.license.id} source={source} />
                </StyledDialog>
            </DialogContent>
        </Dialog>
    );
};
