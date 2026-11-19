import React, { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography
} from '@mui/material';
import { AppInfo, AppUpdateRequest } from '#common/types/apiTypes.js';
import { CloseButton } from '../../components/CloseButton';
import {
    AppEditForm,
    AppEditSection,
    DateField,
    ForgeCheckbox,
    ForgeToggle,
    PricingDateFields
} from './styles';
import { normalizeDateInput } from './pricingUtils';

interface AppEditDraft {
    alwaysForge: boolean;
    forgeMigrationDate: string;
    forgeReleaseDate: string;
    forgePromoStartDate: string;
    forgePromoEndDate: string;
}

interface AppEditDialogProps {
    open: boolean;
    app: AppInfo | null;
    onClose: () => void;
    onSaved: (updated: AppInfo) => void;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const draftFromApp = (app: AppInfo): AppEditDraft => ({
    alwaysForge: app.alwaysForge ?? false,
    forgeMigrationDate: app.forgeMigrationDate ?? '',
    forgeReleaseDate: app.forgeReleaseDate ?? '',
    forgePromoStartDate: app.forgePromoStartDate ?? '',
    forgePromoEndDate: app.forgePromoEndDate ?? ''
});

/** The app counts as Forge if it has always been Forge or has a migration date. */
const isForgeDraft = (draft: AppEditDraft): boolean => (
    draft.alwaysForge || Boolean(normalizeDateInput(draft.forgeMigrationDate))
);

const validateDraft = (draft: AppEditDraft): string | null => {
    const migrationDate = normalizeDateInput(draft.forgeMigrationDate);
    const promoStart = normalizeDateInput(draft.forgePromoStartDate);
    const promoEnd = normalizeDateInput(draft.forgePromoEndDate);

    if (migrationDate && !DATE_PATTERN.test(migrationDate)) {
        return 'Forge migration date must be YYYY-MM-DD';
    }
    if (!isForgeDraft(draft)) {
        // Promo dates are disabled and will be cleared on save
        return null;
    }
    if (promoStart && !DATE_PATTERN.test(promoStart)) {
        return 'Forge 0% promo start date must be YYYY-MM-DD';
    }
    if (promoEnd && !DATE_PATTERN.test(promoEnd)) {
        return 'Forge 0% promo end date must be YYYY-MM-DD';
    }
    if (promoEnd && !promoStart) {
        return 'Enter a start date for the Forge 0% promo, or clear the end date';
    }
    if (promoStart && promoEnd && promoStart > promoEnd) {
        return 'Forge 0% promo start date must be on or before the end date';
    }
    return null;
};

export const AppEditDialog: React.FC<AppEditDialogProps> = ({ open, app, onClose, onSaved }) => {
    const [draft, setDraft] = useState<AppEditDraft | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && app) {
            setDraft(draftFromApp(app));
            setError(null);
        }
    }, [open, app]);

    const updateDraft = (changes: Partial<AppEditDraft>) => {
        setDraft(prev => (prev ? { ...prev, ...changes } : prev));
    };

    const handleClose = () => {
        if (!saving) {
            onClose();
        }
    };

    const handleSave = async () => {
        if (!app || !draft) {
            return;
        }

        const validationError = validateDraft(draft);
        if (validationError) {
            setError(validationError);
            return;
        }

        const isForge = isForgeDraft(draft);

        setSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/apps/${encodeURIComponent(app.addonKey)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    alwaysForge: draft.alwaysForge,
                    forgeMigrationDate: normalizeDateInput(draft.forgeMigrationDate),
                    forgeReleaseDate: normalizeDateInput(draft.forgeReleaseDate),
                    forgePromoStartDate: isForge ? normalizeDateInput(draft.forgePromoStartDate) : null,
                    forgePromoEndDate: isForge ? normalizeDateInput(draft.forgePromoEndDate) : null
                } satisfies AppUpdateRequest)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.error || 'Failed to update app');
            }

            const updated: AppInfo = await response.json();
            onSaved(updated);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update app');
        } finally {
            setSaving(false);
        }
    };

    if (!app || !draft) {
        return null;
    }

    const isForge = isForgeDraft(draft);

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pr: { xs: 11, sm: 8 }, position: 'relative' }}>
                <Box component="span" sx={{ pr: 4 }}>
                    Edit App Data: {app.name || app.addonKey}
                </Box>
                <CloseButton onClose={handleClose} />
            </DialogTitle>
            <DialogContent dividers>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <AppEditForm>
                    <AppEditSection>
                        <Typography variant="subtitle2">Forge status</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Is this app 100% Forge and eligible for the Forge take rates? If so, declare either that the app
                            was always 100% Forge, or else provide a migration date when the last Connect module was removed.
                        </Typography>
                        <ForgeToggle
                            control={(
                                <ForgeCheckbox
                                    checked={draft.alwaysForge}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        updateDraft({
                                            alwaysForge: checked,
                                            forgeMigrationDate: checked ? '' : draft.forgeMigrationDate,
                                            forgeReleaseDate: checked ? draft.forgeReleaseDate : ''
                                        });
                                    }}
                                    disabled={saving}
                                />
                            )}
                            label="This app has always been 100% Forge"
                        />
                        <DateField
                            label="Forge migration date"
                            type="text"
                            size="small"
                            placeholder="YYYY-MM-DD"
                            helperText={draft.alwaysForge
                                ? 'Not applicable to apps that have always been 100% Forge'
                                : 'Cloud sales after this date use the Forge take rate'}
                            value={draft.forgeMigrationDate}
                            onChange={(e) => updateDraft({ forgeMigrationDate: e.target.value })}
                            disabled={draft.alwaysForge || saving}
                        />
                    </AppEditSection>

                    <AppEditSection>
                        <Typography variant="subtitle2">Forge 0% promo</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Forge Cloud sales dated within this range (inclusive) are calculated with a 0% Atlassian
                            take rate. Available only if the app is declared as 100% Forge (above). Leave the end date
                            empty if the promo is still running.
                        </Typography>
                        <PricingDateFields>
                            <DateField
                                label="Promo start date"
                                type="text"
                                size="small"
                                placeholder="YYYY-MM-DD"
                                helperText="First eligible sale date"
                                value={draft.forgePromoStartDate}
                                onChange={(e) => updateDraft({ forgePromoStartDate: e.target.value })}
                                disabled={!isForge || saving}
                            />
                            <DateField
                                label="Promo end date"
                                type="text"
                                size="small"
                                placeholder="YYYY-MM-DD or empty"
                                helperText="Empty = still running"
                                value={draft.forgePromoEndDate}
                                onChange={(e) => updateDraft({ forgePromoEndDate: e.target.value })}
                                disabled={!isForge || saving}
                            />
                        </PricingDateFields>
                        {!isForge && (
                            <Typography variant="caption" color="text.secondary">
                                Mark the app as always Forge or enter a Forge migration date to set promo dates.
                                {(draft.forgePromoStartDate || draft.forgePromoEndDate) && ' Existing promo dates will be cleared on save.'}
                            </Typography>
                        )}
                    </AppEditSection>
                </AppEditForm>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={saving}>Cancel</Button>
                <Button variant="contained" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
