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
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Set both dates to midnight to ensure we're comparing full days
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Calculate the difference in months
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    const totalMonths = years * 12 + months;

    // If the end day of month is the same as the start day of month, return the total integer number of months
    if (end.getDate()===start.getDate()) {
        return totalMonths;
    }

    // Calculate the days in the start and end months
    const daysInStartMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const daysInEndMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();

    // Calculate the fractions of the start and end months
    const startFraction = (daysInStartMonth - start.getDate() + 1) / daysInStartMonth;
    const endFraction = end.getDate() / daysInEndMonth;

    // Calculate the total fractional months
    const adjustedMonths = totalMonths - 1 + startFraction + endFraction;

    console.log(`${startDate} to ${endDate} = ${adjustedMonths.toFixed(2)} months`);
    return adjustedMonths;
}

export { calculateLicenseDuration, calculateLicenseDurationInMonths };