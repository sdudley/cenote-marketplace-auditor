export interface PricingPeriodDates {
    id?: string;
    startDate: string | null;
    endDate: string | null;
}

const MIN_DATE = '0001-01-01';
const MAX_DATE = '9999-12-31';

function effectiveStart(startDate: string | null): string {
    return startDate ?? MIN_DATE;
}

function effectiveEnd(endDate: string | null): string {
    return endDate ?? MAX_DATE;
}

function formatPeriodRange(period: PricingPeriodDates): string {
    const start = period.startDate ?? 'beginning of time';
    const end = period.endDate ?? 'end of time';
    return `${start} – ${end}`;
}

function periodsOverlap(a: PricingPeriodDates, b: PricingPeriodDates): boolean {
    const aStart = effectiveStart(a.startDate);
    const aEnd = effectiveEnd(a.endDate);
    const bStart = effectiveStart(b.startDate);
    const bEnd = effectiveEnd(b.endDate);

    return aStart <= bEnd && bStart <= aEnd;
}

export function validatePricingPeriods(
    existingPeriods: PricingPeriodDates[],
    candidate: PricingPeriodDates
): string | null {
    const others = existingPeriods.filter(period => period.id !== candidate.id);
    const allPeriods = [...others, candidate];

    const nullStartCount = allPeriods.filter(period => period.startDate === null).length;
    if (nullStartCount > 1) {
        return 'Only one pricing period can have no start date (beginning of time)';
    }

    const nullEndCount = allPeriods.filter(period => period.endDate === null).length;
    if (nullEndCount > 1) {
        return 'Only one pricing period can have no end date (end of time)';
    }

    if (candidate.startDate && candidate.endDate && candidate.startDate > candidate.endDate) {
        return 'Start date must be on or before end date';
    }

    for (const other of others) {
        if (periodsOverlap(candidate, other)) {
            return `Pricing period overlaps with existing period (${formatPeriodRange(other)}). If a period ends on a date, the next period must start the following day.`;
        }
    }

    return null;
}

export function isDateOnlyString(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
