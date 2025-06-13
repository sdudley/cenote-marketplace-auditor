import React from 'react';
import { Typography } from '@mui/material';
import { LicenseList } from '#client/pages/licenses/LicenseList';
import { PageContainer, PageTitle } from '../styles';

export const LicensesPage: React.FC = () => {
    return (
        <PageContainer>
            <PageTitle>
                <Typography variant="h4" component="h1">
                    Licenses
                </Typography>
            </PageTitle>
            <LicenseList />
        </PageContainer>
    );
};