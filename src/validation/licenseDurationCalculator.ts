/**
 * Calculate the number of days in the old subscription that overlap with the new
 * subscription.
 */
const getSubscriptionOverlapDays = (
    currentStartDate: string,
    priorEndDate: string|null
): number => {
    if (priorEndDate === null) {
        return 0;
    }

    if (currentStartDate >= priorEndDate) {
        return 0;
    }

    return getLicenseDurationInDays(currentStartDate, priorEndDate) ?? 0;
};

/**
 * Calculate the support duration in days between two dates.
 * If the dates are exactly one or more years apart, returns the number of years * 365.
 * Otherwise, returns the exact number of days between the dates.
 */
const getLicenseDurationInDays = (startDate: string, endDate: string): number => {
    // Create dates at midnight UTC from ISO strings
    const d1 = new Date(Date.UTC(
        parseInt(startDate.substring(0, 4)),
        parseInt(startDate.substring(5, 7)) - 1,
        parseInt(startDate.substring(8, 10))
    ));
    const d2 = new Date(Date.UTC(
        parseInt(endDate.substring(0, 4)),
        parseInt(endDate.substring(5, 7)) - 1,
        parseInt(endDate.substring(8, 10))
    ));
    const d2minusOneDay = new Date(d2);
    d2minusOneDay.setUTCDate(d2minusOneDay.getUTCDate() - 1);

    let exactYearDiff = getExactYearDiff(d1, d2minusOneDay);

    if (exactYearDiff === null) {
        exactYearDiff = getExactYearDiff(d1, d2);
    }

    if (exactYearDiff !== null) {
        return exactYearDiff * 365; // FULL_YEAR
    }

    // Calculate exact days between dates
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Check if two dates are exactly one or more years apart (same month and day).
 * Returns the number of years if they are, null otherwise.
 */
const getExactYearDiff = (d1: Date, d2: Date): number | null => {
    if (d1.getUTCMonth() !== d2.getUTCMonth() || d1.getUTCDate() !== d2.getUTCDate()) {
        return null;
    }

    return d2.getUTCFullYear() - d1.getUTCFullYear();
};

export {
    getSubscriptionOverlapDays,
    getLicenseDurationInDays,
    getExactYearDiff
};