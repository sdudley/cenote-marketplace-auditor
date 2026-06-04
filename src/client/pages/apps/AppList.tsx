import React, { useEffect, useState } from 'react';
import {
    Alert,
    Snackbar,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import { AppInfo, AppUpdateRequest } from '#common/types/apiTypes.js';
import {
    ActionButtons,
    ActionsCell,
    AppsErrorAlert,
    AppsListContainer,
    AppsTableHeadCell,
    AppsTablePaper,
    DateField,
    EmptyStateText,
    ForgeCheckbox,
    ForgeToggle,
    LoadingContainer,
    SmallActionButton
} from './styles';
import { AppPricingDialog } from './AppPricingDialog';

export const AppList: React.FC = () => {
    interface AppEditDraft {
        alwaysForge: boolean;
        forgeMigrationDate: string;
        forgeReleaseDate: string;
    }

    const [apps, setApps] = useState<AppInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingAddonKey, setEditingAddonKey] = useState<string | null>(null);
    const [draft, setDraft] = useState<AppEditDraft | null>(null);
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });
    const [pricingApp, setPricingApp] = useState<AppInfo | null>(null);

    const fetchApps = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/apps');
            if (!response.ok) {
                throw new Error('Failed to fetch apps');
            }

            const data: AppInfo[] = await response.json();
            setApps(data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to fetch apps';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApps();
    }, []);

    const beginEdit = (app: AppInfo) => {
        setDraft({
            alwaysForge: app.alwaysForge ?? false,
            forgeMigrationDate: app.forgeMigrationDate ?? '',
            forgeReleaseDate: app.forgeReleaseDate ?? ''
        });
        setEditingAddonKey(app.addonKey);
    };

    const cancelEdit = () => {
        setEditingAddonKey(null);
        setDraft(null);
    };

    const updateDraft = (changes: Partial<AppEditDraft>) => {
        setDraft(prev => (prev ? { ...prev, ...changes } : prev));
    };

    const saveEdit = async (addonKey: string) => {
        if (!draft) {
            return;
        }

        setSaving(true);
        try {
            const response = await fetch(`/api/apps/${encodeURIComponent(addonKey)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    alwaysForge: Boolean(draft.alwaysForge),
                    forgeMigrationDate: draft.forgeMigrationDate || null,
                    forgeReleaseDate: draft.forgeReleaseDate || null
                } satisfies AppUpdateRequest)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.error || 'Failed to update app');
            }

            const updated: AppInfo = await response.json();
            setApps(prev => prev.map(app => (app.addonKey === addonKey ? updated : app)));
            setSnackbar({
                open: true,
                message: 'App Forge settings updated',
                severity: 'success'
            });
            cancelEdit();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to update app';
            setSnackbar({
                open: true,
                message,
                severity: 'error'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <LoadingContainer>
                <CircularProgress />
            </LoadingContainer>
        );
    }

    return (
        <AppsListContainer>
            {error && <AppsErrorAlert severity="error">{error}</AppsErrorAlert>}
            <TableContainer component={AppsTablePaper}>
                <Table aria-label="apps table">
                    <TableHead>
                        <TableRow>
                            <AppsTableHeadCell>Name</AppsTableHeadCell>
                            <AppsTableHeadCell>Addon Key</AppsTableHeadCell>
                            <AppsTableHeadCell>Parent Product</AppsTableHeadCell>
                            <AppsTableHeadCell>Forge Migration Date</AppsTableHeadCell>
                            <AppsTableHeadCell>This app has always been Forge</AppsTableHeadCell>
                            <AppsTableHeadCell align="right">Actions</AppsTableHeadCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {apps.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6}>
                                    <EmptyStateText variant="body2" color="text.secondary">
                                        No apps found in the addon table.
                                    </EmptyStateText>
                                </TableCell>
                            </TableRow>
                        ) : (
                            apps.map((app) => (
                                <TableRow key={app.addonKey}>
                                    <TableCell>{app.name || 'Unknown'}</TableCell>
                                    <TableCell>{app.addonKey}</TableCell>
                                    <TableCell>{app.parentProduct || 'unknown'}</TableCell>
                                    <TableCell>
                                        {editingAddonKey === app.addonKey && draft ? (
                                            <DateField
                                                type="text"
                                                size="small"
                                                placeholder="YYYY-MM-DD"
                                                value={draft.forgeMigrationDate}
                                                onChange={(e) => updateDraft({ forgeMigrationDate: e.target.value || '' })}
                                                disabled={draft.alwaysForge || saving}
                                                inputProps={{ pattern: '\\d{4}-\\d{2}-\\d{2}' }}
                                            />
                                        ) : (
                                            app.forgeMigrationDate || '-'
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingAddonKey === app.addonKey && draft ? (
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
                                                label="Always Forge"
                                            />
                                        ) : (
                                            app.alwaysForge ? 'Yes' : 'No'
                                        )}
                                    </TableCell>
                                    <ActionsCell align="right">
                                        <ActionButtons>
                                            {editingAddonKey === app.addonKey ? (
                                                <>
                                                    <SmallActionButton
                                                        size="small"
                                                        variant="contained"
                                                        onClick={() => saveEdit(app.addonKey)}
                                                        disabled={saving}
                                                    >
                                                        Save
                                                    </SmallActionButton>
                                                    <SmallActionButton
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={cancelEdit}
                                                        disabled={saving}
                                                    >
                                                        Cancel
                                                    </SmallActionButton>
                                                </>
                                            ) : (
                                                <>
                                                    <SmallActionButton
                                                        size="small"
                                                        variant="contained"
                                                        onClick={() => beginEdit(app)}
                                                    >
                                                        Edit App Data
                                                    </SmallActionButton>
                                                    <SmallActionButton
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => setPricingApp(app)}
                                                    >
                                                        Pricing
                                                    </SmallActionButton>
                                                </>
                                            )}
                                        </ActionButtons>
                                    </ActionsCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <AppPricingDialog
                open={pricingApp !== null}
                app={pricingApp}
                onClose={() => setPricingApp(null)}
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
        </AppsListContainer>
    );
};
