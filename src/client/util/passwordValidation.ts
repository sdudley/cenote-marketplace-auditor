// Re-export password validation utilities for client use
export {
    PASSWORD_MIN_LENGTH,
    PASSWORD_ERROR_MESSAGES,
    validatePasswordLength,
    validatePasswordsMatch,
    validatePassword,
    getPasswordHelperText,
    type PasswordValidationResult,
} from '#common/util/passwordValidation';

