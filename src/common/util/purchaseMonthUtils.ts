const PURCHASE_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function parsePurchaseMonth(purchaseMonth: string): { year: number; month: number; startDate: string; endDate: string } {
    const match = purchaseMonth.match(PURCHASE_MONTH_PATTERN);
    if (!match) {
        throw new Error('purchaseMonth must be in yyyy-mm format');
    }

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const startDate = `${purchaseMonth}-01`;
    const endDate = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`;

    return { year, month, startDate, endDate };
}

export function isValidPurchaseMonth(purchaseMonth: string): boolean {
    return PURCHASE_MONTH_PATTERN.test(purchaseMonth);
}

export function getPriorPurchaseMonth(referenceDate: Date = new Date()): string {
    const prior = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    const year = prior.getFullYear();
    const month = String(prior.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
