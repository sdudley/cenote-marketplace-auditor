import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { TransactionList } from '../components/TransactionList';

export const TransactionsPage: React.FC = () => {
    return (
        <Container maxWidth="xl">
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Transactions
                </Typography>
                <TransactionList />
            </Box>
        </Container>
    );
};