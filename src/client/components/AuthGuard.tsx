import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

interface AuthStatus {
    authenticated: boolean;
    setupRequired?: boolean;
}

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            // First check if setup is required
            const setupResponse = await fetch('/api/auth/setup-required', {
                credentials: 'include',
            });
            const setupData = await setupResponse.json();

            if (setupData.setupRequired) {
                setAuthStatus({ authenticated: false, setupRequired: true });
                setLoading(false);
                return;
            }

            // Then check authentication status
            const authResponse = await fetch('/api/auth/status', {
                credentials: 'include',
            });
            const authData = await authResponse.json();
            setAuthStatus(authData);
        } catch (error) {
            console.error('Error checking auth status:', error);
            setAuthStatus({ authenticated: false });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh',
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    if (authStatus?.setupRequired) {
        return <Navigate to="/setup" replace />;
    }

    if (!authStatus?.authenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

