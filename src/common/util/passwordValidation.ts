export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_ERROR_MESSAGES = {
    TOO_SHORT: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
    MISMATCH: 'Passwords do not match',
} as const;

export interface PasswordValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Validates that a password meets the minimum length requirement
 */
export function validatePasswordLength(password: string): PasswordValidationResult {
    if (password.length < PASSWORD_MIN_LENGTH) {
        return {
            isValid: false,
            error: PASSWORD_ERROR_MESSAGES.TOO_SHORT,
        };
    }
    return { isValid: true };
}

/**
 * Validates that two passwords match
 */
export function validatePasswordsMatch(password: string, confirmPassword: string): PasswordValidationResult {
    if (password !== confirmPassword) {
        return {
            isValid: false,
            error: PASSWORD_ERROR_MESSAGES.MISMATCH,
        };
    }
    return { isValid: true };
}

/**
 * Validates both password length and password match
 */
export function validatePassword(password: string, confirmPassword: string): PasswordValidationResult {
    const lengthResult = validatePasswordLength(password);
    if (!lengthResult.isValid) {
        return lengthResult;
    }

    const matchResult = validatePasswordsMatch(password, confirmPassword);
    if (!matchResult.isValid) {
        return matchResult;
    }

    return { isValid: true };
}

/**
 * Gets the helper text for password input fields
 */
export function getPasswordHelperText(): string {
    return `Must be at least ${PASSWORD_MIN_LENGTH} characters long`;
}

