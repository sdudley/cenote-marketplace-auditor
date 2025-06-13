import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Box
} from '@mui/material';
import { TransactionResult } from '#common/types/apiTypes';
import { formatCurrency } from '#common/util/formatCurrency';
import { StyledDialog } from '../../components/styles';
import { TransactionVersionList } from './TransactionVersionList';
import { CloseButton } from '../../components/CloseButton';

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
                <CloseButton onClose={onClose} />
            </DialogTitle>
            <DialogContent>
                <StyledDialog>
                    <TransactionVersionList transactionId={transactionResult.transaction.id} />
                </StyledDialog>
            </DialogContent>
        </Dialog>
    );
};