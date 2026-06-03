import React, { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField
} from '@mui/material';
import { AppInfo, AppPricingPeriodDetail, AppPricingSaveRequest } from '#common/types/apiTypes';
import { CloseButton } from '../../components/CloseButton';
import {
    DateField,
    ForgeCheckbox,
    ForgeToggle,
    PricingDateFields,
    PricingPeriodForm,
    PricingTierTablePaper
} from './styles';
import { formatUserTierLabel, normalizeDateInput, sortPricingItems } from './pricingUtils';

interface EditablePricingItem {
    userTier: number;
    cost: string;
}

interface AppPricingPeriodDialogProps {
    open: boolean;
    app: AppInfo | null;
    deploymentType: string;
    pricingId: string | null;
    onClose: () => void;
    onSaved: () => void;
}

export const AppPricingPeriodDialog: React.FC<AppPricingPeriodDialogProps> = ({
    open,
    app,
    deploymentType,
    pricingId,
    onClose,
    onSaved
}) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expertDiscountOptOut, setExpertDiscountOptOut] = useState(false);
    const [items, setItems] = useState<EditablePricingItem[]>([]);

    const isEditing = pricingId !== null;

    useEffect(() => {
        if (!open || !app) {
            return;
        }

        const loadPeriod = async () => {
            setLoading(true);
            setError(null);

            try {
                if (pricingId) {
                    const response = await fetch(
                        `/api/apps/${encodeURIComponent(app.addonKey)}/pricing/${encodeURIComponent(pricingId)}`,
                        { credentials: 'include' }
                    );

                    if (!response.ok) {
                        const errData = await response.json().catch(() => null);
                        throw new Error(errData?.error || 'Failed to load pricing period');
                    }

                    const data: AppPricingPeriodDetail = await response.json();
                    setStartDate(data.startDate ?? '');
                    setEndDate(data.endDate ?? '');
                    setExpertDiscountOptOut(data.expertDiscountOptOut);
                    setItems(
                        sortPricingItems(data.items).map(item => ({
                            userTier: item.userTier,
                            cost: String(item.cost)
                        }))
                    );
                } else {
                    const listResponse = await fetch(
                        `/api/apps/${encodeURIComponent(app.addonKey)}/pricing?deploymentType=${encodeURIComponent(deploymentType)}`,
                        { credentials: 'include' }
                    );

                    if (!listResponse.ok) {
                        const errData = await listResponse.json().catch(() => null);
                        throw new Error(errData?.error || 'Failed to load pricing template');
                    }

                    const periods: Array<{ id: string }> = await listResponse.json();
                    const templatePeriod = periods.length > 0
                        ? periods[periods.length - 1]
                        : null;

                    setStartDate('');
                    setEndDate('');
                    setExpertDiscountOptOut(false);

                    if (templatePeriod) {
                        const detailResponse = await fetch(
                            `/api/apps/${encodeURIComponent(app.addonKey)}/pricing/${encodeURIComponent(templatePeriod.id)}`,
                            { credentials: 'include' }
                        );

                        if (detailResponse.ok) {
                            const detail: AppPricingPeriodDetail = await detailResponse.json();
                            setExpertDiscountOptOut(detail.expertDiscountOptOut);
                            setItems(
                                sortPricingItems(detail.items).map(item => ({
                                    userTier: item.userTier,
                                    cost: String(item.cost)
                                }))
                            );
                        } else {
                            setItems([]);
                        }
                    } else {
                        setItems([]);
                    }
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to load pricing period';
                setError(message);
                setItems([]);
            } finally {
                setLoading(false);
            }
        };

        loadPeriod();
    }, [open, app, deploymentType, pricingId]);

    const updateItemCost = (userTier: number, cost: string) => {
        setItems(prev => prev.map(item => (
            item.userTier === userTier ? { ...item, cost } : item
        )));
    };

    const handleSave = async () => {
        if (!app) {
            return;
        }

        const parsedItems = items.map(item => {
            const cost = Number.parseFloat(item.cost);
            return {
                userTier: item.userTier,
                cost
            };
        });

        if (parsedItems.some(item => !Number.isFinite(item.cost) || item.cost < 0)) {
            setError('Each pricing tier must have a valid non-negative cost');
            return;
        }

        const payload: AppPricingSaveRequest = {
            deploymentType,
            startDate: normalizeDateInput(startDate),
            endDate: normalizeDateInput(endDate),
            expertDiscountOptOut,
            items: parsedItems
        };

        setSaving(true);
        setError(null);

        try {
            const url = isEditing
                ? `/api/apps/${encodeURIComponent(app.addonKey)}/pricing/${encodeURIComponent(pricingId)}`
                : `/api/apps/${encodeURIComponent(app.addonKey)}/pricing`;

            const response = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.error || 'Failed to save pricing period');
            }

            onSaved();
            onClose();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to save pricing period';
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    if (!app) {
        return null;
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ pr: { xs: 11, sm: 8 }, position: 'relative' }}>
                <Box component="span" sx={{ pr: 4 }}>
                    {isEditing ? 'Edit Pricing Period' : 'Add Pricing Period'}
                </Box>
                <CloseButton onClose={onClose} />
            </DialogTitle>
            <DialogContent dividers>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <PricingPeriodForm>
                        <PricingDateFields>
                            <DateField
                                label="Start date"
                                type="text"
                                size="small"
                                placeholder="YYYY-MM-DD or empty"
                                helperText="Empty = beginning of time"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                disabled={saving}
                            />
                            <DateField
                                label="End date"
                                type="text"
                                size="small"
                                placeholder="YYYY-MM-DD or empty"
                                helperText="Empty = end of time"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                disabled={saving}
                            />
                            <ForgeToggle
                                control={(
                                    <ForgeCheckbox
                                        checked={expertDiscountOptOut}
                                        onChange={(e) => setExpertDiscountOptOut(e.target.checked)}
                                        disabled={saving}
                                    />
                                )}
                                label="Expert discount opt-out"
                            />
                        </PricingDateFields>

                        <TableContainer component={PricingTierTablePaper}>
                            <Table size="small" aria-label="pricing tiers table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>User tier</TableCell>
                                        <TableCell align="right">Cost (USD)</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {items.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2}>
                                                No pricing tiers available. Import pricing or copy from another period first.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        items.map(item => (
                                            <TableRow key={item.userTier}>
                                                <TableCell>{formatUserTierLabel(item.userTier)}</TableCell>
                                                <TableCell align="right">
                                                    <TextField
                                                        type="number"
                                                        size="small"
                                                        value={item.cost}
                                                        onChange={(e) => updateItemCost(item.userTier, e.target.value)}
                                                        disabled={saving}
                                                        inputProps={{ min: 0, step: '0.01' }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </PricingPeriodForm>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving || loading || items.length === 0}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};
