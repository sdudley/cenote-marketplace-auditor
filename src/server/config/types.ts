/*
 * Injection tokens for the DI container (general use)
 *
 * See also: src/server/express/config/expressTypes.ts
 */

export const TYPES = {
    DataSource: Symbol.for('DataSource'),
    MarketplaceService: Symbol.for('MarketplaceService'),
    AddonJob: Symbol.for('AddonJob'),
    AddonDao: Symbol.for('AddonDao'),
    TransactionJob: Symbol.for('TransactionJob'),
    LicenseJob: Symbol.for('LicenseJob'),
    PricingJob: Symbol.for('PricingJob'),
    PricingService: Symbol.for('PricingService'),
    ValidationJob: Symbol.for('ValidationJob'),
    PriceCalculatorService: Symbol.for('PriceCalculatorService'),
    IgnoredFieldService: Symbol.for('IgnoredFieldService'),
    TransactionDao: Symbol.for('TransactionDao'),
    TransactionReconcileDao: Symbol.for('TransactionReconcileDao'),
    LicenseDao: Symbol.for('LicenseDao'),
    LicenseVersionDao: Symbol.for('LicenseVersionDao'),
    TransactionAdjustmentDao: Symbol.for('TransactionAdjustmentDao'),
    TransactionVersionDao: Symbol.for('TransactionVersionDao'),
    ResellerDao: Symbol.for('ResellerDao'),
    PreviousTransactionService: Symbol.for('PreviousTransactionService'),
    TransactionValidationService: Symbol.for('TransactionValidationService'),
    TransactionSandboxService: Symbol.for('TransactionSandboxService'),
    TransactionAdjustmentValidationService: Symbol.for('TransactionAdjustmentValidationService'),
    TransactionDiffValidationService: Symbol.for('TransactionDiffValidationService'),
    TransactionValidator: Symbol.for('TransactionValidator'),
    ConfigDao: Symbol.for('ConfigDao'),
    JobDao: Symbol.for('JobDao'),
    JobStarter: Symbol.for('JobStarter'),
    SchedulerService: Symbol.for('SchedulerService'),
    SlackService: Symbol.for('SlackService')
};