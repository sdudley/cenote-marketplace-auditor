import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { TransactionsPage } from './pages/TransactionsPage';
import { PageLayout } from './pages/PageLayout';

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
            }
        ]
    }
]);