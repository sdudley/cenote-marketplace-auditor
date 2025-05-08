export function createUTCDateFromString(dateString: string): Date {
    return new Date(Date.UTC(
        parseInt(dateString.substring(0, 4)),
        parseInt(dateString.substring(5, 7)) - 1,
        parseInt(dateString.substring(8, 10))
    ));
}

export function createLocalDateFromString(dateString: string): Date {
    // Parse the date components
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(5, 7)) - 1; // 0-based month
    const day = parseInt(dateString.substring(8, 10));

    // Create date in local timezone
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    return date;
}

/**
 * Strips time component from a date, setting it to midnight
 */
export function stripTimeFromDate(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
}