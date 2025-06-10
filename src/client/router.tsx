import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { TransactionsPage } from './pages/TransactionsPage';
import { PageLayout } from './pages/PageLayout';
import { ConfigPage } from './pages/ConfigPage';
import { JobsPage } from './pages/JobsPage/JobsPage';
import { LicensesPage } from './pages/LicensesPage';

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