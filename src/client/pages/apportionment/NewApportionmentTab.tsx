import React, { useState } from 'react';
import {
    Button,
    Alert,
    CircularProgress,
    Typography
} from '@mui/material';
import { Dayjs } from 'dayjs';
import { MonthlyAggregateApportionmentResponse } from '#common/types/apportionment';
import { ApportionmentForm } from './styles';
import { getDefaultPurchaseMonth, PurchaseMonthPicker, purchaseMonthFromDayjs } from './PurchaseMonthPicker';
import { ApportionmentResultsDisplay } from './ApportionmentResultsDisplay';

export const NewApportionmentTab: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState<Dayjs>(getDefaultPurchaseMonth);
    const [result, setResult] = useState<MonthlyAggregateApportionmentResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const handleCalculate = async () => {
        const purchaseMonth = purchaseMonthFromDayjs(selectedMonth);

        setIsCalculating(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/apportionment/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ purchaseMonth })
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to calculate apportionment');
            }

            setResult(await response.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to calculate apportionment');
        } finally {
            setIsCalculating(false);
        }
    };

    return (
        <>
            <ApportionmentForm>
                <PurchaseMonthPicker
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                />
                <Button
                    variant="contained"
                    onClick={handleCalculate}
                    disabled={isCalculating || !selectedMonth.isValid()}
                >
                    {isCalculating ? 'Calculating...' : 'Calculate'}
                </Button>
                {isCalculating && <CircularProgress size={24} />}
            </ApportionmentForm>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {result && (
                <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Apportionment for transactions purchased in {result.purchaseMonth}
                    </Typography>
                    <ApportionmentResultsDisplay result={result} />
                </>
            )}
        </>
    );
};
