import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { PageLayout } from './PageLayout';
import { TransactionsPage } from './pages/transactions';
import { LicensesPage } from './pages/licenses';
import { ConfigPage } from './pages/config';
import { JobsPage } from './pages/jobs';
import { UsersPage } from './pages/users';
import { LoginPage, SetupPage } from './pages/auth';
import { AuthGuard } from './components/AuthGuard';

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/setup',
        element: <SetupPage />,
    },
    {
        path: '/',
        element: (
            <AuthGuard>
                <PageLayout />
            </AuthGuard>
        ),
        children: [
            {
                index: true,
                element: <TransactionsPage />,
            },
            {
                path: 'transactions',
                element: <TransactionsPage />,
            },
            {
                path: 'licenses',
                element: <LicensesPage />,
            },
            {
                path: 'config',
                element: <ConfigPage />,
            },
            {
                path: 'tasks',
                element: <JobsPage />,
            },
            {
                path: 'users',
                element: <UsersPage />,
            }
        ]
    }
]);