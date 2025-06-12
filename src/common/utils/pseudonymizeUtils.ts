import { faker } from '@faker-js/faker';

// Helper function to generate a random string of specified length
export function randomizeString(length: number): string {
    return faker.string.alphanumeric(length).toUpperCase();
}

export function randomizeNumericString(length: number): string {
    return faker.string.numeric(length);
}

// Helper function to generate a formatted ID
export function generateFormattedId(): string {
    const parts = [
        randomizeString(3),  // First part (e.g., "436")
        randomizeString(3),  // Second part (e.g., "M54")
        randomizeString(3),  // Third part (e.g., "Z6M")
        randomizeString(3)   // Fourth part (e.g., "3FR")
    ];
    return parts.join('-');
}

// Helper function to scale an amount by a random factor
export function scaleAmount(amount: number): number {
    const scaleFactor = faker.number.float({ min: 0.8, max: 1.2, fractionDigits: 2 });
    return Math.round(amount * scaleFactor);
}

// Helper function to transform currency amounts in text
export function transformCurrencyInText(text: string, scaleFactor: number): string {
    return text.replace(/\$([0-9,]+(\.[0-9]{2})?)/g, (match, amount) => {
        const numericAmount = parseFloat(amount.replace(/,/g, ''));
        const scaledAmount = Math.round(numericAmount * scaleFactor);
        return `$${scaledAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    });
}

// Helper function to transform an ID while preserving its prefix
export function transformIdWithPrefix(id: string): string {
    if (id.startsWith('SEN-')) {
        return `SEN-${randomizeNumericString(7)}`;
    } else if (id.startsWith('E-')) {
        return `E-${generateFormattedId()}`;
    } else {
        return randomizeString(12);
    }
}