import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Box,
    Typography,
    CircularProgress,
    Alert
} from '@mui/material';
import { CloseButton } from '../../components/CloseButton';
import { PriceTestSnippetResponse } from '#common/types/transactionPricing';
import { TransactionData } from '#common/types/marketplace';
import { buildPriceTestSnippetStrings } from './priceTestSnippetUtils';
import { SnippetTextAreaBox, SnippetLabel } from '../../components/styles';

interface CopyPriceTestDialogProps {
    open: boolean;
    onClose: () => void;
    transactionId: string;
    transactionData: TransactionData | null;
}

export const CopyPriceTestDialog: React.FC<CopyPriceTestDialogProps> = ({
    open,
    onClose,
    transactionId,
    transactionData
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [testCode, setTestCode] = useState('');
    const [pricingTableExport, setPricingTableExport] = useState('');
    const [constantName, setConstantName] = useState('');

    useEffect(() => {
        if (!open || !transactionData?.purchaseDetails) {
            setTestCode('');
            setPricingTableExport('');
            setConstantName('');
            setError(null);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);

        fetch(`/api/transactions/${transactionId}/price-test-snippet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionData })
        })
            .then(async (res) => {
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body?.error || res.statusText || 'Request failed');
                }
                return res.json() as Promise<PriceTestSnippetResponse>;
            })
            .then((response) => {
                if (cancelled) return;
                const { saleDate, saleType, tier } = transactionData.purchaseDetails;
                const testName = `live: ${saleDate} ${saleType} ${tier}`;
                const { testCode: code, pricingTableExport: table, constantName: name } = buildPriceTestSnippetStrings(response, testName);
                setTestCode(code);
                setPricingTableExport(table);
                setConstantName(name);
            })
            .catch((err) => {
                if (!cancelled) setError(err?.message || 'Failed to load snippet');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [open, transactionId, transactionData]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ pr: { xs: 11, sm: 8 }, position: 'relative' }}>
                Copy as PriceCalculatorService test
                <CloseButton onClose={onClose} />
            </DialogTitle>
            <DialogContent dividers>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <CircularProgress />
                    </Box>
                )}
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                {!loading && !error && constantName && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box>
                            <SnippetLabel>Test code (paste into PriceCalculatorService.test.ts)</SnippetLabel>
                            <SnippetTextAreaBox>
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={12}
                                    maxRows={24}
                                    value={testCode}
                                    onFocus={(e) => e.target.select()}
                                    InputProps={{ readOnly: true }}
                                    variant="outlined"
                                    size="small"
                                />
                            </SnippetTextAreaBox>
                            <Typography variant="caption" color="text.secondary">
                                Constant name: {constantName} — use same name in pricingTable.ts to deduplicate
                            </Typography>
                        </Box>
                        <Box>
                            <SnippetLabel>Pricing tier result (paste into pricingTable.ts if not already present)</SnippetLabel>
                            <SnippetTextAreaBox>
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={8}
                                    maxRows={20}
                                    value={pricingTableExport}
                                    onFocus={(e) => e.target.select()}
                                    InputProps={{ readOnly: true }}
                                    variant="outlined"
                                    size="small"
                                />
                            </SnippetTextAreaBox>
                        </Box>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};
