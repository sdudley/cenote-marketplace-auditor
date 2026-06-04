import React from 'react';
import { Typography } from '@mui/material';
import {
    MonthlyAggregateApportionmentResponse,
    YearlyApportionmentByAddon
} from '#common/types/apportionment.js';
import { formatCurrency } from '#common/util/formatCurrency.js';
import {
    ApportionmentResultsTable,
    ApportionmentSection,
    ApportionmentSectionHeading,
    ApportionmentAddonGroup,
    ApportionmentHostingGroup
} from './styles';

interface ApportionmentValueTableProps {
    periodLabel: string;
    valueLabel?: string;
    rows: { period: string; actualValue: number; transactionCount?: number }[];
    showTransactionCount?: boolean;
    footerTransactionCount?: number;
}

const ApportionmentValueTable: React.FC<ApportionmentValueTableProps> = ({
    periodLabel,
    valueLabel = 'Actual Value',
    rows,
    showTransactionCount = false,
    footerTransactionCount
}) => {
    const totalValue = rows.reduce((sum, row) => sum + row.actualValue, 0);
    const totalTransactions = footerTransactionCount
        ?? rows.reduce((sum, row) => sum + (row.transactionCount ?? 0), 0);

    return (
        <ApportionmentResultsTable>
            <thead>
                <tr>
                    <th>{periodLabel}</th>
                    <th>{valueLabel}</th>
                    {showTransactionCount && <th>Transactions</th>}
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <tr key={row.period}>
                        <td>{row.period}</td>
                        <td>{formatCurrency(row.actualValue)}</td>
                        {showTransactionCount && <td>{row.transactionCount ?? 0}</td>}
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr>
                    <td>Total</td>
                    <td>{formatCurrency(totalValue)}</td>
                    {showTransactionCount && <td>{totalTransactions}</td>}
                </tr>
            </tfoot>
        </ApportionmentResultsTable>
    );
};

const YearlyByAddonSection: React.FC<{ byAddon: YearlyApportionmentByAddon[] }> = ({ byAddon }) => {
    if (byAddon.length === 0) {
        return null;
    }

    return (
        <ApportionmentSection>
            <ApportionmentSectionHeading variant="subtitle1" fontWeight="bold" color="text.secondary">
                By product and hosting
            </ApportionmentSectionHeading>
            {byAddon.map((addonGroup) => (
                <ApportionmentAddonGroup key={addonGroup.addonKey}>
                    <Typography variant="body2" fontWeight="bold" color="text.secondary">
                        {addonGroup.addonName ?? addonGroup.addonKey}
                    </Typography>
                    {addonGroup.byHosting.map((hostingGroup) => (
                        <ApportionmentHostingGroup key={`${addonGroup.addonKey}-${hostingGroup.hosting}`}>
                            <Typography variant="body2" color="text.secondary">
                                {hostingGroup.hosting}
                            </Typography>
                            <ApportionmentValueTable
                                periodLabel="Year"
                                rows={hostingGroup.years.map((entry) => ({
                                    period: entry.year,
                                    actualValue: entry.actualValue
                                }))}
                            />
                        </ApportionmentHostingGroup>
                    ))}
                </ApportionmentAddonGroup>
            ))}
        </ApportionmentSection>
    );
};

interface ApportionmentResultsDisplayProps {
    result: MonthlyAggregateApportionmentResponse;
}

export const ApportionmentResultsDisplay: React.FC<ApportionmentResultsDisplayProps> = ({ result }) => {
    const uniqueTransactionCount = new Set(
        result.months.flatMap((entry) => entry.transactions.map((t) => t.transactionId))
    ).size;

    if (result.months.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                No apportionment data found for transactions in this month.
            </Typography>
        );
    }

    return (
        <>
            <ApportionmentSection>
                <ApportionmentSectionHeading variant="subtitle1" fontWeight="bold" color="text.secondary">
                    Yearly totals (all products)
                </ApportionmentSectionHeading>
                <ApportionmentValueTable
                    periodLabel="Year"
                    rows={result.years.map((entry) => ({
                        period: entry.year,
                        actualValue: entry.actualValue
                    }))}
                />
            </ApportionmentSection>

            <YearlyByAddonSection byAddon={result.byAddon} />

            <ApportionmentSection>
                <ApportionmentSectionHeading variant="subtitle1" fontWeight="bold" color="text.secondary">
                    Monthly apportionment
                </ApportionmentSectionHeading>
                <ApportionmentValueTable
                    periodLabel="Month"
                    rows={result.months.map((entry) => ({
                        period: entry.month,
                        actualValue: entry.actualValue,
                        transactionCount: entry.transactions.length
                    }))}
                    showTransactionCount
                    footerTransactionCount={uniqueTransactionCount}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {uniqueTransactionCount} unique transaction{uniqueTransactionCount === 1 ? '' : 's'} purchased in {result.purchaseMonth}
                </Typography>
            </ApportionmentSection>
        </>
    );
};
