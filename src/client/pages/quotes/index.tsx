import React from 'react';
import { Typography } from '@mui/material';
import { QuoteList } from '#client/pages/quotes/QuoteList.js';
import { PageContainer, PageTitle } from '../styles';

export const QuotesPage: React.FC = () => {
    return (
        <PageContainer>
            <PageTitle>
                <Typography variant="h4" component="h1">
                    Quotes
                </Typography>
            </PageTitle>
            <QuoteList />
        </PageContainer>
    );
};
