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
import { StyledDialog } from '../styles';
import { TransactionVersionList } from './TransactionVersionList';

interface TransactionVersionListDialogProps {
    transactionResult: TransactionResult | null;
    open: boolean;
    onClose: () => void;
}

export const TransactionVersionListDialog: React.FC<TransactionVersionListDialogProps> = ({
    transactionResult,
    open,
    onClose
}) => {
    if (!transactionResult) return null;

    const { saleDate, vendorAmount, saleType, tier } = transactionResult.transaction.data.purchaseDetails;
    const { company } = transactionResult.transaction.data.customerDetails;
    const { addonKey } = transactionResult.transaction.data;

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
                    <TransactionVersionList transactionId={transactionResult.transaction.id} />
                </StyledDialog>
            </DialogContent>
        </Dialog>
    );
};