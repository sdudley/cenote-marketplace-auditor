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
import { AppInfo } from '#common/types/apiTypes.js';
import {
    ActionButtons,
    ActionsCell,
    AppsErrorAlert,
    AppsListContainer,
    AppsTableHeadCell,
    AppsTablePaper,
    EmptyStateText,
    LoadingContainer,
    SmallActionButton
} from './styles';
import { AppPricingDialog } from './AppPricingDialog';
import { AppEditDialog } from './AppEditDialog';

export const AppList: React.FC = () => {
    const [apps, setApps] = useState<AppInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingApp, setEditingApp] = useState<AppInfo | null>(null);
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

    const handleSaved = (updated: AppInfo) => {
        setApps(prev => prev.map(app => (app.addonKey === updated.addonKey ? updated : app)));
        setEditingApp(null);
        setSnackbar({
            open: true,
            message: 'App data updated',
            severity: 'success'
        });
    };

    const formatPromoRange = (app: AppInfo) => (
        app.forgePromoStartDate
            ? `${app.forgePromoStartDate} to ${app.forgePromoEndDate || 'present'}`
            : '-'
    );

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
                            <AppsTableHeadCell>Always Forge</AppsTableHeadCell>
                            <AppsTableHeadCell>Forge 0% Promo</AppsTableHeadCell>
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
                                    <TableCell>{app.forgeMigrationDate || '-'}</TableCell>
                                    <TableCell>{app.alwaysForge ? 'Yes' : 'No'}</TableCell>
                                    <TableCell>{formatPromoRange(app)}</TableCell>
                                    <ActionsCell align="right">
                                        <ActionButtons>
                                            <SmallActionButton
                                                size="small"
                                                variant="contained"
                                                onClick={() => setEditingApp(app)}
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
                                        </ActionButtons>
                                    </ActionsCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <AppEditDialog
                open={editingApp !== null}
                app={editingApp}
                onClose={() => setEditingApp(null)}
                onSaved={handleSaved}
            />
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
