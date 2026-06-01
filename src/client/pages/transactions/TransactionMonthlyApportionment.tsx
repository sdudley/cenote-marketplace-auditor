import React from 'react';
import { Typography } from '@mui/material';
import { TransactionMonthlyApportionmentResponse } from '#common/types/transactionPricing';
import { formatCurrency } from '#common/util/formatCurrency';
import { NotesHeadingBox } from '#client/components/styles.js';
import { MonthlyApportionmentTable } from '../styles';

interface TransactionMonthlyApportionmentProps {
    apportionment: TransactionMonthlyApportionmentResponse | null;
}

export const TransactionMonthlyApportionment: React.FC<TransactionMonthlyApportionmentProps> = ({ apportionment }) => {
    if (!apportionment || apportionment.months.length === 0) {
        return null;
    }

    const totalEstimated = apportionment.months.reduce((sum, entry) => sum + entry.estimatedValue, 0);
    const totalActual = apportionment.months.reduce((sum, entry) => sum + entry.actualValue, 0);

    return (
        <>
            <NotesHeadingBox>
                <Typography variant="subtitle1" fontWeight="bold" color="text.secondary">
                    Monthly Price Apportionment
                </Typography>
            </NotesHeadingBox>

            <MonthlyApportionmentTable>
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Estimated</th>
                        <th>Atlassian Actual</th>
                    </tr>
                </thead>
                <tbody>
                    {apportionment.months.map((entry) => (
                        <tr key={entry.month}>
                            <td>{entry.month}</td>
                            <td>{formatCurrency(entry.estimatedValue)}</td>
                            <td>{formatCurrency(entry.actualValue)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td>Total</td>
                        <td>{formatCurrency(totalEstimated)}</td>
                        <td>{formatCurrency(totalActual)}</td>
                    </tr>
                </tfoot>
            </MonthlyApportionmentTable>
        </>
    );
};
