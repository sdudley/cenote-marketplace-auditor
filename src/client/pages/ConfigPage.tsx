import React, { useEffect, useState } from 'react';
import {
    TextField,
    Button,
    Snackbar,
    Alert,
    CircularProgress,
    FormControlLabel,
    Checkbox
} from '@mui/material';
import { PageContainer, PageTitle, ConfigPageTitle, ConfigFormContainer, ConfigFormFields, ConfigSaveButtonContainer, LoadingContainer, ConfigColumn, SchedulerContainer } from './styles';
import { ConfigKey } from '#common/types/configItem';
import { StyledLink } from './styles';
import { SlackContainer } from './styles';

export const ConfigPage: React.FC = () => {
    const [configValues, setConfigValues] = useState<Record<ConfigKey, string | number>>({
        [ConfigKey.AtlassianAccountUser]: '',
        [ConfigKey.AtlassianAccountApiToken]: '',
        [ConfigKey.AtlassianVendorId]: '',
        [ConfigKey.SchedulerFrequency]: 0,
        [ConfigKey.SlackBotToken]: '',
        [ConfigKey.SlackChannelSales]: '',
        [ConfigKey.SlackChannelEvaluations]: '',
        [ConfigKey.SlackChannelExceptions]: '',
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
    const [schedulerEnabled, setSchedulerEnabled] = useState(false);
    const [slackEnabled, setSlackEnabled] = useState(false);

    useEffect(() => {
        loadConfigValues();
    }, []);

    const loadConfigValues = async () => {
        try {
            setLoading(true);
            // Load regular config values
            const configValues = await Promise.all(
                Object.values(ConfigKey)
                    .filter(key => key !== ConfigKey.SchedulerFrequency)
                    .map(async (key) => {
                        const response = await fetch(`/api/config/${key}`);
                        if (response.ok) {
                            const data = await response.json();
                            return [key, data.value];
                        }
                        return [key, ''];
                    })
            );

            // Load scheduler frequency separately
            const schedulerResponse = await fetch('/api/scheduler');
            if (schedulerResponse.ok) {
                const schedulerData = await schedulerResponse.json();
                configValues.push([ConfigKey.SchedulerFrequency, schedulerData.frequency]);
                setSchedulerEnabled(schedulerData.frequency > 0);
            }

            const configValuesObj = Object.fromEntries(configValues);
            setConfigValues(configValuesObj);
            setSlackEnabled(Boolean(configValuesObj[ConfigKey.SlackBotToken]));
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
            // Save regular config values
            await Promise.all(
                Object.entries(configValues)
                    .filter(([key]) => key !== ConfigKey.SchedulerFrequency)
                    .map(async ([key, value]) => {
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

            // Validate scheduler frequency before saving
            const frequency = configValues[ConfigKey.SchedulerFrequency];
            if (schedulerEnabled && (typeof frequency !== 'number' || frequency <= 0)) {
                throw new Error('Frequency must be a positive number when scheduler is enabled');
            }

            // Save scheduler frequency separately
            const schedulerResponse = await fetch('/api/scheduler', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ frequency: schedulerEnabled ? frequency : 0 }),
            });
            if (!schedulerResponse.ok) {
                throw new Error('Failed to save scheduler frequency');
            }

            setSnackbar({
                open: true,
                message: 'Configuration saved successfully',
                severity: 'success',
            });
        } catch (error) {
            console.error('Error saving config values:', error);
            setSnackbar({
                open: true,
                message: error instanceof Error ? error.message : 'Failed to save configuration values',
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

    const handleSchedulerToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSchedulerEnabled(event.target.checked);
        if (!event.target.checked) {
            setConfigValues((prev) => ({
                ...prev,
                [ConfigKey.SchedulerFrequency]: 0,
            }));
        } else if (configValues[ConfigKey.SchedulerFrequency] === 0) {
            setConfigValues((prev) => ({
                ...prev,
                [ConfigKey.SchedulerFrequency]: 4,
            }));
        }
    };

    const handleSlackToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSlackEnabled(event.target.checked);
        if (!event.target.checked) {
            setConfigValues((prev) => ({
                ...prev,
                [ConfigKey.SlackBotToken]: '',
                [ConfigKey.SlackChannelSales]: '',
                [ConfigKey.SlackChannelEvaluations]: '',
                [ConfigKey.SlackChannelExceptions]: '',
            }));
        }
    };

    const handleFrequencyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value === '' ? '' : parseInt(event.target.value, 10);
        if (value === '' || !isNaN(value)) {
            setConfigValues((prev) => ({
                ...prev,
                [ConfigKey.SchedulerFrequency]: value,
            }));
        }
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
                    <ConfigColumn>
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
                                    <StyledLink
                                        href="https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Atlassian instructions for creating an API token
                                    </StyledLink>
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
                        <SchedulerContainer>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={schedulerEnabled}
                                        onChange={handleSchedulerToggle}
                                    />
                                }
                                label="Enable Scheduled Data Retrieval"
                            />
                            {schedulerEnabled && (
                                <TextField
                                    label="Data Retrieval Frequency (hours)"
                                    type="number"
                                    value={configValues[ConfigKey.SchedulerFrequency]}
                                    onChange={handleFrequencyChange}
                                    fullWidth
                                    sx={{ mt: 1 }}
                                    inputProps={{ min: 1 }}
                                    helperText="How often to run tasks to fetch new transactions and licenses"
                                />
                            )}
                        </SchedulerContainer>
                    </ConfigColumn>

                    <ConfigColumn>
                        <SlackContainer>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={slackEnabled}
                                        onChange={handleSlackToggle}
                                    />
                                }
                                label="Post Messages to Slack"
                            />
                            {slackEnabled && (
                                <>
                                    <TextField
                                        label="Slack Bot Token"
                                        value={configValues[ConfigKey.SlackBotToken]}
                                        onChange={handleChange(ConfigKey.SlackBotToken)}
                                        fullWidth
                                        sx={{ mt: 2 }}
                                        helperText="Bot token for your Slack app (starts with xoxb-)"
                                    />
                                    <TextField
                                        label="Channel for Sales"
                                        value={configValues[ConfigKey.SlackChannelSales]}
                                        onChange={handleChange(ConfigKey.SlackChannelSales)}
                                        fullWidth
                                        sx={{ mt: 2 }}
                                        InputProps={{
                                            startAdornment: <span>#</span>,
                                        }}
                                        helperText="Channel to post sales notifications. Leave blank to disable."
                                    />
                                    <TextField
                                        label="Channel for New Evaluations"
                                        value={configValues[ConfigKey.SlackChannelEvaluations]}
                                        onChange={handleChange(ConfigKey.SlackChannelEvaluations)}
                                        fullWidth
                                        sx={{ mt: 2 }}
                                        InputProps={{
                                            startAdornment: <span>#</span>,
                                        }}
                                        helperText="Channel to post new evaluation notifications. Leave blank to disable."
                                    />
                                    <TextField
                                        label="Channel for Exceptions"
                                        value={configValues[ConfigKey.SlackChannelExceptions]}
                                        onChange={handleChange(ConfigKey.SlackChannelExceptions)}
                                        fullWidth
                                        sx={{ mt: 2 }}
                                        InputProps={{
                                            startAdornment: <span>#</span>,
                                        }}
                                        helperText="Channel to post exception notifications. Leave blank to disable."
                                    />
                                </>
                            )}
                        </SlackContainer>
                    </ConfigColumn>
                </ConfigFormFields>

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