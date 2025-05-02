const calculateLicenseDuration = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Set both dates to midnight to ensure we're comparing full days
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Calculate the difference in days
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    console.log(`${startDate} to ${endDate} = ${diffDays} days`);
    return diffDays;
}

const calculateLicenseDurationInMonths = (startDate: string, endDate: string): number => {
    // Create UTC dates from the ISO strings
    const start = new Date(Date.UTC(
        parseInt(startDate.substring(0, 4)), // year
        parseInt(startDate.substring(5, 7)) - 1, // month (0-based)
        parseInt(startDate.substring(8, 10)) // day
    ));
    const end = new Date(Date.UTC(
        parseInt(endDate.substring(0, 4)), // year
        parseInt(endDate.substring(5, 7)) - 1, // month (0-based)
        parseInt(endDate.substring(8, 10)) // day
    ));

    // Calculate the difference in months
    const years = end.getUTCFullYear() - start.getUTCFullYear();
    const months = end.getUTCMonth() - start.getUTCMonth();
    const totalMonths = years * 12 + months;

    if (end.getUTCDate() === start.getUTCDate()) {
        return totalMonths;
    }

    // Check if either date is the last day of its month
    const isStartLastDay = start.getUTCDate() === new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    const isEndLastDay = end.getUTCDate() === new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();

    // If either date is the last day of its month, return the total integer number of months
    if ((isStartLastDay || isEndLastDay) && start.getUTCDate() >= 28 && end.getUTCDate() >= 28) {
        return totalMonths;
    }

    // Calculate the days in the start and end months
    const daysInStartMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    const daysInEndMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();

    // Calculate the fractions of the start and end months
    const startFraction = (daysInStartMonth - start.getUTCDate() + 1) / daysInStartMonth;
    const endFraction = end.getUTCDate() / daysInEndMonth;

    // Calculate the total fractional months
    const adjustedMonths = totalMonths - 1 + startFraction + endFraction;

    console.log(`${startDate} to ${endDate} = ${adjustedMonths.toFixed(2)} months`);
    return adjustedMonths;
}

export { calculateLicenseDuration, calculateLicenseDurationInMonths };