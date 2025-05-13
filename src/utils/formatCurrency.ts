
const formatCurrency = (value: number | undefined): string => {
    if (value === undefined) return '$0.00';
    return `$${value.toFixed(2)}`;
};

export { formatCurrency };