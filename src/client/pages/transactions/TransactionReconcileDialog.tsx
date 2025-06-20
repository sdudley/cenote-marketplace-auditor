import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography
} from '@mui/material';
import { TransactionResult } from '#common/types/apiTypes';
import { TransactionReconcileNote } from '#common/entities/TransactionReconcileNote';
import { TransactionPricingResponse } from '#common/types/transactionPricing';
import { formatCurrency } from '#common/util/formatCurrency';
import { isoStringWithDateAndTime } from '#common/util/dateUtils';
import {
    StyledDialog,
    InfoTableBox,
    ReconciliationStatus,
    AmountMismatch,
    ReconciliationGrid,
    AmountsBox,
    NotesList,
    NoteRow,
    DialogTitleBox,
    DialogTitleSubtitle,
    NotesHeadingBox,
    NotesSectionBox
} from '../../components/styles';
import { CloseButton } from '../../components/CloseButton';
import { TransactionPricingDetail } from './TransactionPricingDetail';

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
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [existingNotes, setExistingNotes] = useState<TransactionReconcileNote[]>([]);
    const [pricing, setPricing] = useState<TransactionPricingResponse | null>(null);
    const [isLoadingPricing, setIsLoadingPricing] = useState(false);

    useEffect(() => {
        setExistingNotes(transaction?.transaction.reconcile?.notes ?? []);
    }, [transaction]);

    useEffect(() => {
        if (transaction && open) {
            fetchPricingData();
        }
    }, [transaction, open]);

    const fetchPricingData = async () => {
        if (!transaction) return;

        setIsLoadingPricing(true);
        try {
            const response = await fetch(`/api/transactions/${transaction.transaction.id}/pricing`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const pricingData = await response.json();
                setPricing(pricingData);
            } else {
                console.error('Failed to fetch pricing data');
                setPricing(null);
            }
        } catch (error) {
            console.error('Error fetching pricing data:', error);
            setPricing(null);
        } finally {
            setIsLoadingPricing(false);
        }
    };

    if (!transaction) return null;

    const { saleDate, vendorAmount, saleType, tier } = transaction.transaction.data.purchaseDetails;
    const { company } = transaction.transaction.data.customerDetails;
    const { addonKey } = transaction.transaction.data;
    const reconcile = transaction.transaction.reconcile;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(reconcile?.reconciled || false, notes);
            onClose();
        } catch (error) {
            console.error('Error saving reconciliation:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const getStatusClass = () => {
        if (!reconcile?.reconciled) return 'unreconciled';
        return reconcile.automatic ? 'automatic' : 'manual';
    };

    const getStatusText = () => {
        if (!reconcile?.reconciled) return 'Unreconciled';
        return reconcile.automatic ? 'Reconciled (Automatic)' : 'Reconciled (Manual)';
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                <DialogTitleBox>
                    <Typography variant="h6">Transaction Reconciliation Details</Typography>
                    <DialogTitleSubtitle variant="subtitle1">
                        {saleDate} • {addonKey} • {saleType} • {tier} • {formatCurrency(vendorAmount)} • {company}
                    </DialogTitleSubtitle>
                </DialogTitleBox>
                <CloseButton onClose={onClose} />
            </DialogTitle>
            <DialogContent>
                <StyledDialog>
                    <InfoTableBox>
                        {reconcile && (
                            <>
                                <ReconciliationGrid>
                                    <Typography variant="body2" fontWeight="bold" color="text.secondary">Status:</Typography>
                                    <ReconciliationStatus variant="body2" className={getStatusClass()}>
                                        {getStatusText()}
                                    </ReconciliationStatus>

                                    <Typography variant="body2" fontWeight="bold" color="text.secondary">Transaction Version:</Typography>
                                    <Typography variant="body2">{reconcile.transactionVersion}</Typography>

                                    <Typography variant="body2" fontWeight="bold" color="text.secondary">Last Updated:</Typography>
                                    <Typography variant="body2">
                                        {isoStringWithDateAndTime(reconcile.updatedAt.toString())}
                                    </Typography>

                                    <Typography variant="body2" fontWeight="bold" color="text.secondary">Reconciler Engine Version:</Typography>
                                    <Typography variant="body2">{reconcile.reconcilerVersion}</Typography>
                                </ReconciliationGrid>

                                <AmountsBox>
                                    <Typography variant="body2" fontWeight="bold" color="text.secondary">Expected Amount:</Typography>
                                    <Typography variant="body2">
                                        {reconcile.expectedVendorAmount !== undefined ? formatCurrency(reconcile.expectedVendorAmount) : '-'}
                                    </Typography>

                                    <Typography variant="body2" fontWeight="bold" color="text.secondary">Actual Amount:</Typography>
                                    {!reconcile.reconciled && reconcile.actualVendorAmount !== reconcile.expectedVendorAmount ? (
                                        <AmountMismatch variant="body2">
                                            {reconcile.actualVendorAmount !== undefined ? formatCurrency(reconcile.actualVendorAmount) : '-'}
                                        </AmountMismatch>
                                    ) : (
                                        <Typography variant="body2">
                                            {reconcile.actualVendorAmount !== undefined ? formatCurrency(reconcile.actualVendorAmount) : '-'}
                                        </Typography>
                                    )}
                                </AmountsBox>
                            </>
                        )}

                        <TransactionPricingDetail pricing={pricing} />

                        {existingNotes.length > 0 && (
                            <NotesSectionBox>
                                <NotesHeadingBox>
                                    <Typography variant="subtitle1" fontWeight="bold" color="text.secondary">
                                        Notes
                                    </Typography>
                                </NotesHeadingBox>
                                <NotesList>
                                    {existingNotes.map((note) => (
                                        <NoteRow key={note.id}>
                                            <Typography variant="body2" color="text.secondary">
                                                {isoStringWithDateAndTime(note.createdAt.toString())}
                                            </Typography>
                                            <Typography variant="body2">
                                                {note.note}
                                            </Typography>
                                        </NoteRow>
                                    ))}
                                </NotesList>
                            </NotesSectionBox>
                        )}

                        {/* <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Add New Note"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any notes about this reconciliation..."
                        /> */}
                    </InfoTableBox>
                </StyledDialog>
            </DialogContent>
            {/* <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    color="primary"
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions> */}
        </Dialog>
    );
};