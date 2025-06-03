import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

export const App: React.FC = () => {
    return <RouterProvider router={router} />;
};