const formatCurrency = (value: number | undefined): string => {
    if (typeof value === 'undefined') return '';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export { formatCurrency };