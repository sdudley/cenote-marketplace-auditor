import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Typography,
    Box
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { TransactionResult } from '#common/types/apiTypes';
import { formatCurrency } from '#common/utils/formatCurrency';
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
    if (!transaction) return null;

    const { saleDate, vendorAmount, saleType, tier } = transaction.transaction.data.purchaseDetails;
    const { company } = transaction.transaction.data.customerDetails;
    const { addonKey } = transaction.transaction.data;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="h6">Transaction Versions</Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        {saleDate} • {addonKey} • {saleType} • {tier} • {formatCurrency(vendorAmount)} • {company}
                    </Typography>
                </Box>
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
                        {/* Version list will be added here in the next step */}
                    </DialogContentBox>
                </StyledDialog>
            </DialogContent>
        </Dialog>
    );
};