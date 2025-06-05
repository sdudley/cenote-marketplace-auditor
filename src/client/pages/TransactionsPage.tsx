import React from 'react';
import { Typography } from '@mui/material';
import { TransactionList } from '../components/TransactionList';
import { PageContainer, PageTitle } from './styles';

export const TransactionsPage: React.FC = () => {
    return (
        <PageContainer>
            <PageTitle>
                <Typography variant="h4" component="h1">
                    Transactions
                </Typography>
            </PageTitle>
            <TransactionList />
        </PageContainer>
    );
};