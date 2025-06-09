import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    FormControlLabel,
    Checkbox,
    List,
    ListItem,
    ListItemText,
    Divider,
    Paper
} from '@mui/material';
import { TransactionResult } from '#common/types/apiTypes';
import { TransactionReconcileNote } from '#common/entities/TransactionReconcileNote';
import { formatCurrency } from '#common/utils/formatCurrency';
import { isoStringWithDateAndTime } from '#common/utils/dateUtils';
import { StyledDialog, DialogContentBox, InfoTableBox } from '../styles';
import { CloseButton } from '../CloseButton';

interface TransactionReconcileDialogProps {
    transaction: TransactionResult | null;
    open: boolean;
    onClose: () => void;
    onSave: (reconciled: boolean, notes: string) => Promise<void>;
}

export const TransactionReconcileDialog: React.FC<TransactionReconcileDialogProps> = ({
    transaction,
    open,
    onClose,
    onSave
}) => {
    const [reconciled, setReconciled] = useState(transaction?.transaction.reconcile?.reconciled || false);
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [existingNotes, setExistingNotes] = useState<TransactionReconcileNote[]>([]);

    useEffect(() => {
        if (transaction?.transaction.reconcile?.notes) {
            setExistingNotes(transaction.transaction.reconcile.notes);
        }
    }, [transaction]);

    if (!transaction) return null;

    const { saleDate, vendorAmount, saleType, tier } = transaction.transaction.data.purchaseDetails;
    const { company } = transaction.transaction.data.customerDetails;
    const { addonKey } = transaction.transaction.data;
    const reconcile = transaction.transaction.reconcile;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(reconciled, notes);
            onClose();
        } catch (error) {
            console.error('Error saving reconciliation:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="h6">Reconcile Transaction</Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        {saleDate} • {addonKey} • {saleType} • {tier} • {formatCurrency(vendorAmount)} • {company}
                    </Typography>
                </Box>
                <CloseButton onClose={onClose} />
            </DialogTitle>
            <DialogContent>
                <StyledDialog>
                    <InfoTableBox>
                        <Box sx={{ mb: 2 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={reconciled}
                                        onChange={(e) => setReconciled(e.target.checked)}
                                    />
                                }
                                label="Mark as Reconciled"
                            />
                        </Box>

                        {reconcile && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Current Reconciliation Status
                                </Typography>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1 }}>
                                        <Typography variant="body2" color="text.secondary">Status:</Typography>
                                        <Typography variant="body2">
                                            {reconcile.reconciled ? 'Reconciled' : 'Not Reconciled'}
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary">Created:</Typography>
                                        <Typography variant="body2">
                                            {isoStringWithDateAndTime(reconcile.createdAt.toString())}
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary">Last Updated:</Typography>
                                        <Typography variant="body2">
                                            {isoStringWithDateAndTime(reconcile.updatedAt.toString())}
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary">Transaction Version:</Typography>
                                        <Typography variant="body2">{reconcile.transactionVersion}</Typography>

                                        <Typography variant="body2" color="text.secondary">Automatic:</Typography>
                                        <Typography variant="body2">{reconcile.automatic ? 'Yes' : 'No'}</Typography>

                                        {reconcile.actualVendorAmount !== undefined && (
                                            <>
                                                <Typography variant="body2" color="text.secondary">Actual Amount:</Typography>
                                                <Typography variant="body2">{formatCurrency(reconcile.actualVendorAmount)}</Typography>
                                            </>
                                        )}

                                        {reconcile.expectedVendorAmount !== undefined && (
                                            <>
                                                <Typography variant="body2" color="text.secondary">Expected Amount:</Typography>
                                                <Typography variant="body2">{formatCurrency(reconcile.expectedVendorAmount)}</Typography>
                                            </>
                                        )}
                                    </Box>
                                </Paper>
                            </Box>
                        )}

                        {existingNotes.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    Existing Notes
                                </Typography>
                                <Paper variant="outlined">
                                    <List dense>
                                        {existingNotes.map((note, index) => (
                                            <React.Fragment key={note.id}>
                                                <ListItem>
                                                    <ListItemText
                                                        primary={note.note}
                                                        secondary={isoStringWithDateAndTime(note.createdAt.toString())}
                                                    />
                                                </ListItem>
                                                {index < existingNotes.length - 1 && <Divider />}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                </Paper>
                            </Box>
                        )}

                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Add New Note"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any notes about this reconciliation..."
                        />
                    </InfoTableBox>
                </StyledDialog>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    color="primary"
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};