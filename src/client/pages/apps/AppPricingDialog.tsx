import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import { AppInfo, AppPricingPeriodSummary } from '#common/types/apiTypes';
import { CloseButton } from '../../components/CloseButton';
import {
    AppsTableHeadCell,
    AppsTablePaper,
    PricingDeploymentSelect,
    PricingDialogActions,
    PricingDialogContent,
    PricingPeriodActions,
    SmallActionButton
} from './styles';
import { AppPricingPeriodDialog } from './AppPricingPeriodDialog';
import { DEPLOYMENT_TYPE_OPTIONS, formatExpertDiscountOptOut, formatPricingPeriodDate } from './pricingUtils';

interface AppPricingDialogProps {
    open: boolean;
    app: AppInfo | null;
    onClose: () => void;
}

export const AppPricingDialog: React.FC<AppPricingDialogProps> = ({ open, app, onClose }) => {
    const [deploymentType, setDeploymentType] = useState<string>('cloud');
    const [periods, setPeriods] = useState<AppPricingPeriodSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
    const [editingPricingId, setEditingPricingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AppPricingPeriodSummary | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    const fetchPeriods = useCallback(async () => {
        if (!app) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/apps/${encodeURIComponent(app.addonKey)}/pricing?deploymentType=${encodeURIComponent(deploymentType)}`,
                { credentials: 'include' }
            );

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.error || 'Failed to fetch pricing periods');
            }

            const data: AppPricingPeriodSummary[] = await response.json();
            setPeriods(data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to fetch pricing periods';
            setError(message);
            setPeriods([]);
        } finally {
            setLoading(false);
        }
    }, [app, deploymentType]);

    useEffect(() => {
        if (open && app) {
            fetchPeriods();
        }
    }, [open, app, fetchPeriods]);

    const openAddPeriodDialog = () => {
        setEditingPricingId(null);
        setPeriodDialogOpen(true);
    };

    const openEditPeriodDialog = (periodId: string) => {
        setEditingPricingId(periodId);
        setPeriodDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!app || !deleteTarget) {
            return;
        }

        setDeleting(true);

        try {
            const response = await fetch(
                `/api/apps/${encodeURIComponent(app.addonKey)}/pricing/${encodeURIComponent(deleteTarget.id)}`,
                {
                    method: 'DELETE',
                    credentials: 'include'
                }
            );

            if (!response.ok && response.status !== 204) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.error || 'Failed to delete pricing period');
            }

            setSnackbar({
                open: true,
                message: 'Pricing period deleted',
                severity: 'success'
            });
            setDeleteTarget(null);
            await fetchPeriods();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to delete pricing period';
            setSnackbar({
                open: true,
                message,
                severity: 'error'
            });
        } finally {
            setDeleting(false);
        }
    };

    if (!app) {
        return null;
    }

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle sx={{ pr: { xs: 11, sm: 8 }, position: 'relative' }}>
                    <Box component="span" sx={{ pr: 4 }}>
                        Pricing — {app.name}
                    </Box>
                    <CloseButton onClose={onClose} />
                </DialogTitle>
                <DialogContent dividers>
                    <PricingDialogContent>
                        <PricingDeploymentSelect>
                            <FormControl fullWidth size="small">
                                <InputLabel id="deployment-type-label">Hosting type</InputLabel>
                                <Select
                                    labelId="deployment-type-label"
                                    label="Hosting type"
                                    value={deploymentType}
                                    onChange={(e) => setDeploymentType(e.target.value)}
                                >
                                    {DEPLOYMENT_TYPE_OPTIONS.map(option => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </PricingDeploymentSelect>

                        {error && <Alert severity="error">{error}</Alert>}

                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <TableContainer component={AppsTablePaper}>
                                <Table size="small" aria-label="pricing periods table">
                                    <TableHead>
                                        <TableRow>
                                            <AppsTableHeadCell>Start date</AppsTableHeadCell>
                                            <AppsTableHeadCell>End date</AppsTableHeadCell>
                                            <AppsTableHeadCell>Expert discount opt-out</AppsTableHeadCell>
                                            <AppsTableHeadCell align="right">Actions</AppsTableHeadCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {periods.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4}>
                                                    No pricing periods for this hosting type.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            periods.map(period => (
                                                <TableRow key={period.id}>
                                                    <TableCell>
                                                        {formatPricingPeriodDate(period.startDate, 'start')}
                                                    </TableCell>
                                                    <TableCell>
                                                        {formatPricingPeriodDate(period.endDate, 'end')}
                                                    </TableCell>
                                                    <TableCell>
                                                        {formatExpertDiscountOptOut(period.expertDiscountOptOut)}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <PricingPeriodActions>
                                                            <SmallActionButton
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={() => openEditPeriodDialog(period.id)}
                                                            >
                                                                Edit
                                                            </SmallActionButton>
                                                            <SmallActionButton
                                                                size="small"
                                                                variant="outlined"
                                                                color="error"
                                                                onClick={() => setDeleteTarget(period)}
                                                            >
                                                                Delete
                                                            </SmallActionButton>
                                                        </PricingPeriodActions>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        <PricingDialogActions>
                            <Button variant="contained" onClick={openAddPeriodDialog} disabled={loading}>
                                Add pricing period
                            </Button>
                        </PricingDialogActions>
                    </PricingDialogContent>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Close</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleteTarget !== null}
                onClose={() => !deleting && setDeleteTarget(null)}
            >
                <DialogTitle>Delete pricing period?</DialogTitle>
                <DialogContent>
                    This will permanently delete the pricing period
                    {deleteTarget && (
                        <>
                            {' '}
                            ({formatPricingPeriodDate(deleteTarget.startDate, 'start')}
                            {' '}
                            to
                            {' '}
                            {formatPricingPeriodDate(deleteTarget.endDate, 'end')})
                        </>
                    )}
                    {' '}
                    and all of its tier prices.
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDeleteConfirm}
                        disabled={deleting}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <AppPricingPeriodDialog
                open={periodDialogOpen}
                app={app}
                deploymentType={deploymentType}
                pricingId={editingPricingId}
                onClose={() => setPeriodDialogOpen(false)}
                onSaved={() => {
                    setSnackbar({
                        open: true,
                        message: editingPricingId ? 'Pricing period updated' : 'Pricing period created',
                        severity: 'success'
                    });
                    fetchPeriods();
                }}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};
