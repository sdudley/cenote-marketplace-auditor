/**
 * Converts CamelCase strings to human-readable words
 * @param key - The CamelCase string to convert
 * @returns Human-readable string with spaces and proper capitalization
 */
export const humanizeKey = (key: string): string => {
    // Convert CamelCase to human-readable words
    return key
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .trim(); // Remove leading/trailing spaces
};