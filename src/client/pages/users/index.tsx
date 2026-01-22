import React from 'react';
import { Typography } from '@mui/material';
import { UserList } from './UserList';
import { PageContainer, PageTitle } from '../styles';

export const UsersPage: React.FC = () => {
    return (
        <PageContainer>
            <PageTitle>
                <Typography variant="h4" component="h1">
                    Users
                </Typography>
            </PageTitle>
            <UserList />
        </PageContainer>
    );
};

