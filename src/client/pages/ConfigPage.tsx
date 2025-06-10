import React, { useEffect, useState } from 'react';
import {
    TextField,
    Button,
    Snackbar,
    Alert,
    CircularProgress,
} from '@mui/material';
import { PageContainer, PageTitle, ConfigPageTitle, ConfigFormContainer, ConfigFormFields, ConfigSaveButtonContainer, LoadingContainer } from './styles';
import { ConfigKey } from '#common/types/configItem';

export const ConfigPage: React.FC = () => {
    const [configValues, setConfigValues] = useState<Record<ConfigKey, string>>({
        [ConfigKey.AtlassianAccountUser]: '',
        [ConfigKey.AtlassianAccountApiToken]: '',
        [ConfigKey.AtlassianVendorId]: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({
        open: false,
        message: '',
        severity: 'success',
    });

    useEffect(() => {
        loadConfigValues();
    }, []);

    const loadConfigValues = async () => {
        try {
            setLoading(true);
            const values = await Promise.all(
                Object.values(ConfigKey).map(async (key) => {
                    const response = await fetch(`/api/config/${key}`);
                    if (response.ok) {
                        const data = await response.json();
                        return [key, data.value];
                    }
                    return [key, ''];
                })
            );
            setConfigValues(Object.fromEntries(values));
        } catch (error) {
            console.error('Error loading config values:', error);
            setSnackbar({
                open: true,
                message: 'Failed to load configuration values',
                severity: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await Promise.all(
                Object.entries(configValues).map(async ([key, value]) => {
                    const response = await fetch(`/api/config/${key}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ value }),
                    });
                    if (!response.ok) {
                        throw new Error(`Failed to save ${key}`);
                    }
                })
            );
            setSnackbar({
                open: true,
                message: 'Configuration saved successfully',
                severity: 'success',
            });
        } catch (error) {
            console.error('Error saving config values:', error);
            setSnackbar({
                open: true,
                message: 'Failed to save configuration values',
                severity: 'error',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key: ConfigKey) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setConfigValues((prev) => ({
            ...prev,
            [key]: event.target.value,
        }));
    };

    if (loading) {
        return (
            <PageContainer>
                <LoadingContainer>
                    <CircularProgress />
                </LoadingContainer>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageTitle>
                <ConfigPageTitle variant="h4" component="h1">
                    Configuration
                </ConfigPageTitle>
            </PageTitle>

            <ConfigFormContainer>
                <ConfigFormFields>
                    <TextField
                        label="Atlassian Account User"
                        value={configValues[ConfigKey.AtlassianAccountUser]}
                        onChange={handleChange(ConfigKey.AtlassianAccountUser)}
                        fullWidth
                        helperText="Email address for your account (you@example.com)"
                    />
                    <TextField
                        label="Atlassian Account API Token"
                        value={configValues[ConfigKey.AtlassianAccountApiToken]}
                        onChange={handleChange(ConfigKey.AtlassianAccountApiToken)}
                        fullWidth
                        type="password"
                        helperText={
                            <React.Fragment>
                                To create an API token, follow the{' '}
                                <a
                                    href="https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'inherit', textDecoration: 'underline' }}
                                >
                                    Atlassian instructions for creating an API token
                                </a>
                                . The account must be <a
                                href="https://developer.atlassian.com/platform/marketplace/managing-permissions-on-your-vendor-account/"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'inherit', textDecoration: 'underline' }}
                                >granted access to the Atlassian Marketplace</a>{' '}
                                with at least "View sales reports" and "View all other reports" permissions.
                            </React.Fragment>
                        }
                    />
                    <TextField
                        label="Atlassian Vendor ID"
                        value={configValues[ConfigKey.AtlassianVendorId]}
                        onChange={handleChange(ConfigKey.AtlassianVendorId)}
                        fullWidth
                        helperText="Vendor ID for your developer account. This is visible in the URL for the Marketplace vendor dashboard, such as: https://marketplace.atlassian.com/manage/vendors/########/"
                    />
                    <ConfigSaveButtonContainer>
                        <Button
                            variant="contained"
                            onClick={handleSave}
                            disabled={saving}
                            sx={{ textTransform: 'none' }}
                        >
                            {saving ? <CircularProgress size={24} /> : 'Save'}
                        </Button>
                    </ConfigSaveButtonContainer>
                </ConfigFormFields>
            </ConfigFormContainer>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </PageContainer>
    );
};