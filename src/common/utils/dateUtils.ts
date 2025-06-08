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

export function isoDateMath(date: string, days: number): string {
    const dateObj = new Date(date);
    dateObj.setDate(dateObj.getDate() + days);
    return dateObj.toISOString().split('T')[0];
}

export function isoStringWithOnlyDate(date: string) : string {
    return date.substring(0, 10);
}

export function isoStringWithDateAndTime(date: string) : string {
    return date.substring(0, 16).replace('T', ' ') + ' UTC';
}

export function dateDiff(startDate: string, endDate: string) : number {
    const d1 = createUTCDateFromString(startDate);
    const d2 = createUTCDateFromString(endDate);

    // Calculate exact days between dates
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
};