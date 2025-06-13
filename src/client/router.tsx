import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { PageLayout } from './PageLayout';
import { TransactionsPage } from './pages/transactions';
import { LicensesPage } from './pages/licenses';
import { ConfigPage } from './pages/config';
import { JobsPage } from './pages/jobs';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <PageLayout />,
        children: [
            {
                path: '/',
                element: <TransactionsPage />,
            },
            {
                path: '/transactions',
                element: <TransactionsPage />,
            },
            {
                path: '/licenses',
                element: <LicensesPage />,
            },
            {
                path: '/config',
                element: <ConfigPage />,
            },
            {
                path: '/tasks',
                element: <JobsPage />,
            }
        ]
    }
]);