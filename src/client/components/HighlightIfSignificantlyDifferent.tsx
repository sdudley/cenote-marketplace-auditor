import * as React from 'react';
import { formatCurrency } from '#common/utils/formatCurrency';

const SIGNIFICANT_DIFFERENCE_THRESHOLD = 5.00; // Highlight differences greater than this amount

export const HighlightIfSignificantlyDifferent = ({value, compareToValue}: {value: number|undefined, compareToValue: number|undefined}) => {
    if (value === undefined || compareToValue === undefined) {
        return <span>{formatCurrency(value)}</span>;
    }

    const diff = Math.abs(value - compareToValue);

    if (diff >= SIGNIFICANT_DIFFERENCE_THRESHOLD) {
        return <span style={{ color: 'red' }}>{formatCurrency(value)}</span>;
    }

    return <span>{formatCurrency(value)}</span>;
};
