import { userTierSorter } from '#common/util/userTierSorter';
import { AppPricingInfoDto } from '#common/types/apiTypes';

export const DEPLOYMENT_TYPE_OPTIONS = [
    { value: 'cloud', label: 'Cloud' },
    { value: 'server', label: 'Server' },
    { value: 'datacenter', label: 'Data Center' }
] as const;

export function formatPricingPeriodDate(date: string | null, boundary: 'start' | 'end'): string {
    if (date === null) {
        return boundary === 'start' ? 'Beginning of time' : 'End of time';
    }

    return date;
}

export function formatUserTierLabel(userTier: number): string {
    if (userTier === -1) {
        return 'Unlimited Users';
    }

    return `${userTier} users`;
}

export function sortPricingItems(items: AppPricingInfoDto[]): AppPricingInfoDto[] {
    return [...items].sort(userTierSorter);
}

export function normalizeDateInput(value: string): string | null {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

export function formatExpertDiscountOptOut(value: boolean): string {
    return value ? 'Yes' : 'No';
}
