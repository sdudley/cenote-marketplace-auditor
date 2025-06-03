import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { TransactionsPage } from './pages/TransactionsPage';
import { Layout } from './components/Layout';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
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