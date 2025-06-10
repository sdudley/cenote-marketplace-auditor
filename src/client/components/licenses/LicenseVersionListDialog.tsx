import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from '@mui/material';
import { LicenseVersionList } from './LicenseVersionList';

interface LicenseVersionListDialogProps {
    licenseId: string;
    open: boolean;
    onClose: () => void;
}

export const LicenseVersionListDialog: React.FC<LicenseVersionListDialogProps> = ({
    licenseId,
    open,
    onClose,
}) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>License Versions</DialogTitle>
            <DialogContent>
                <LicenseVersionList licenseId={licenseId} />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};