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
import { AppInfo, AppUpdateRequest } from '#common/types/apiTypes';
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

export const AppList: React.FC = () => {
    const [apps, setApps] = useState<AppInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingAddonKey, setEditingAddonKey] = useState<string | null>(null);
    const [draft, setDraft] = useState<AppUpdateRequest | null>(null);
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

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
        setEditingAddonKey(app.addonKey);
        setDraft({
            alwaysForge: app.alwaysForge ?? false,
            forgeMigrationDate: app.forgeMigrationDate ?? null,
            forgeReleaseDate: app.forgeReleaseDate ?? null
        });
    };

    const cancelEdit = () => {
        setEditingAddonKey(null);
        setDraft(null);
    };

    const updateDraft = (changes: Partial<AppUpdateRequest>) => {
        setDraft(prev => ({ ...prev, ...changes }));
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
                            <AppsTableHeadCell>Forge Release Date</AppsTableHeadCell>
                            <AppsTableHeadCell align="right">Actions</AppsTableHeadCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {apps.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7}>
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
                                        {editingAddonKey === app.addonKey ? (
                                            <DateField
                                                type="date"
                                                size="small"
                                                value={draft?.forgeMigrationDate || ''}
                                                onChange={(e) => updateDraft({ forgeMigrationDate: e.target.value || null })}
                                                disabled={Boolean(draft?.alwaysForge) || saving}
                                            />
                                        ) : (
                                            app.forgeMigrationDate || '-'
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {editingAddonKey === app.addonKey ? (
                                            <ForgeToggle
                                                control={(
                                                    <ForgeCheckbox
                                                        checked={Boolean(draft?.alwaysForge)}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            updateDraft({
                                                                alwaysForge: checked,
                                                                forgeMigrationDate: checked ? null : (draft?.forgeMigrationDate || null),
                                                                forgeReleaseDate: checked ? (draft?.forgeReleaseDate || null) : null
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
                                    <TableCell>
                                        {editingAddonKey === app.addonKey ? (
                                            <DateField
                                                type="date"
                                                size="small"
                                                value={draft?.forgeReleaseDate || ''}
                                                onChange={(e) => updateDraft({ forgeReleaseDate: e.target.value || null })}
                                                disabled={!Boolean(draft?.alwaysForge) || saving}
                                            />
                                        ) : (
                                            app.forgeReleaseDate || '-'
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
                                                <SmallActionButton
                                                    size="small"
                                                    variant="contained"
                                                    onClick={() => beginEdit(app)}
                                                >
                                                    Edit
                                                </SmallActionButton>
                                            )}
                                        </ActionButtons>
                                    </ActionsCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
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
