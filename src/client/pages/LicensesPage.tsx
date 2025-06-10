import React from 'react';
import { Typography } from '@mui/material';
import { LicenseList } from '#client/components/licenses/LicenseList';

export const LicensesPage: React.FC = () => {
    return (
        <>
            <Typography variant="h4" component="h1" gutterBottom>
                Licenses
            </Typography>
            <LicenseList />
        </>
    );
};