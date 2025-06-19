/*
 * Injection tokens for the DI container (Express-specific)
 *
 * See also: src/server/config/types.ts
 */

export const EXPRESS_TYPES = {
    TransactionRoute: Symbol.for('TransactionRoute'),
    TransactionVersionRoute: Symbol.for('TransactionVersionRoute'),
    TransactionReconcileRoute: Symbol.for('TransactionReconcileRoute'),
    ConfigRoute: Symbol.for('ConfigRoute'),
    JobRoute: Symbol.for('JobRoute'),
    ApiRouter: Symbol.for('ApiRouter'),
    LicenseRoute: Symbol.for('LicenseRoute'),
    LicenseVersionRoute: Symbol.for('LicenseVersionRoute'),
    SchedulerRoute: Symbol.for('SchedulerRoute'),
    TransactionPricingRoute: Symbol.for('TransactionPricingRoute')
};