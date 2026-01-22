import React, { useState, useEffect } from 'react';
import {
    TextField,
    Button,
    Snackbar,
    Alert,
    CircularProgress,
    Typography,
    Box,
    Container,
    Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { validatePassword, getPasswordHelperText } from '../../util/passwordValidation';

export const SetupPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if setup is actually needed
        const checkSetupRequired = async () => {
            try {
                const response = await fetch('/api/auth/setup-required', {
                    credentials: 'include',
                });
                const data = await response.json();
                if (!data.setupRequired) {
                    // Setup already completed, redirect to login
                    navigate('/login', { replace: true });
                }
            } catch (error) {
                console.error('Error checking setup status:', error);
            } finally {
                setChecking(false);
            }
        };
        checkSetupRequired();
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const passwordValidation = validatePassword(password, confirmPassword);
        if (!passwordValidation.isValid) {
            setError(passwordValidation.error!);
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email, password, confirmPassword }),
            });

            if (response.ok) {
                // Redirect to home after successful setup
                navigate('/', { replace: true });
            } else {
                const data = await response.json();
                setError(data.error || 'Setup failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <Container maxWidth="sm">
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                    }}
                >
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="sm">
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                }}
            >
                <Paper
                    elevation={3}
                    sx={{
                        padding: 4,
                        width: '100%',
                        maxWidth: 400,
                    }}
                >
                    <Typography variant="h4" component="h1" gutterBottom align="center">
                        Cenote Marketplace Auditor Initial Setup
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                        Create the first administrator account
                    </Typography>

                    <form onSubmit={handleSubmit}>
                        <TextField
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            fullWidth
                            required
                            margin="normal"
                            autoComplete="email"
                        />
                        <TextField
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            fullWidth
                            required
                            margin="normal"
                            autoComplete="new-password"
                            helperText={getPasswordHelperText()}
                        />
                        <TextField
                            label="Confirm Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            fullWidth
                            required
                            margin="normal"
                            autoComplete="new-password"
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={loading}
                            sx={{ mt: 3, mb: 2 }}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Create Account'}
                        </Button>
                    </form>
                </Paper>
            </Box>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>
        </Container>
    );
};

