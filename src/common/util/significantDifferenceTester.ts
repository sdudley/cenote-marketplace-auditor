const SIGNIFICANT_DIFFERENCE_THRESHOLD = 10.00; // Highlight differences greater than this amount

export const isSignificantlyDifferent = (value: number|undefined, compareToValue: number|undefined) => {
    if (value === undefined || compareToValue === undefined) {
        return false;
    }

    const diff = Math.abs(value - compareToValue);

    return (diff >= SIGNIFICANT_DIFFERENCE_THRESHOLD);
};