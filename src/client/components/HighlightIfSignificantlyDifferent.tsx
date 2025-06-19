import * as React from 'react';
import { formatCurrency } from '#common/util/formatCurrency';
import { isSignificantlyDifferent } from '#common/util/significantDifferenceTester';

export const HighlightIfSignificantlyDifferent = ({value, compareToValue}: {value: number|undefined, compareToValue: number|undefined}) => {
    return <span style={isSignificantlyDifferent(value, compareToValue) ? { color: 'red' } : {}}>
        {formatCurrency(value)}
        </span>;
};
