import React from 'react';
import { Typography } from '@mui/material';
import { AppList } from './AppList';
import { PageContainer, PageTitle } from '../styles';

export const AppsPage: React.FC = () => {
    return (
        <PageContainer>
            <PageTitle>
                <Typography variant="h4" component="h1">
                    Apps
                </Typography>
            </PageTitle>
            <AppList />
        </PageContainer>
    );
};
