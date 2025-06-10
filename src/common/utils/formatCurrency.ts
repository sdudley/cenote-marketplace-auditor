const formatCurrency = (value: number | undefined): string => {
    if (typeof value === 'undefined') return '$0.00';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export { formatCurrency };