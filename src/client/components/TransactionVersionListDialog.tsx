import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Typography
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { TransactionResult } from '#common/types/apiTypes';
import { StyledDialog, DialogContentBox } from './styles';

interface TransactionVersionListDialogProps {
    transaction: TransactionResult | null;
    open: boolean;
    onClose: () => void;
}

export const TransactionVersionListDialog: React.FC<TransactionVersionListDialogProps> = ({
    transaction,
    open,
    onClose
}) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
        >
            <DialogTitle>
                Transaction Versions
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8
                    }}
                >
                    <Close />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <StyledDialog>
                    <DialogContentBox>
                        <Typography variant="h6">
                            Transaction ID: {transaction?.transaction.id}
                        </Typography>
                        {/* Version list will be added here in the next step */}
                    </DialogContentBox>
                </StyledDialog>
            </DialogContent>
        </Dialog>
    );
};