import { Container } from 'inversify';
import { DataSource } from 'typeorm';
import { MarketplaceService } from '../services/MarketplaceService';
import { AddonJob } from '../jobs/AddonJob';
import { TransactionJob } from '../jobs/TransactionJob';
import { LicenseJob } from '../jobs/LicenseJob';
import { PricingJob } from '../jobs/PricingJob';
import { ValidationJob } from '../jobs/ValidationJob';
import { PriceCalculatorService } from '../services/PriceCalculatorService';
import { IgnoredFieldService } from '../services/IgnoredFieldService';
import { TransactionDao } from '../database/dao/TransactionDao';
import { LicenseDao } from '../database/dao/LicenseDao';
import { TransactionReconcileDao } from '../database/dao/TransactionReconcileDao';
import { TYPES } from './types';
import { TransactionAdjustmentDao } from '../database/dao/TransactionAdjustmentDao';
import { ResellerDao } from '../database/dao/ResellerDao';
import { PreviousTransactionService } from '../services/PreviousTransactionService';
import { AddonDao } from '../database/dao/AddonDao';
import { PricingService } from '../services/PricingService';
import { TransactionVersionDao } from '#server/database/dao/TransactionVersionDao';
import { TransactionValidationService } from '#server/services/transactionValidation/TransactionValidationService';
import { TransactionSandboxService } from '#server/services/transactionValidation/TransactionSandboxService';
import { TransactionValidator } from '#server/services/transactionValidation/TransactionValidator';
import { TransactionAdjustmentValidationService } from '#server/services/transactionValidation/TransactionAdjustmentValidationService';
import { TransactionDiffValidationService } from '#server/services/transactionValidation/TransactionDiffValidationService';
import { ConfigDao } from '../database/dao/ConfigDao';
import { JobDao } from '../database/dao/JobDao';
import { JobRunner } from '../jobs/JobRunner';
import { LicenseVersionDao } from '../database/dao/LicenseVersionDao';
import { SchedulerService } from '../services/SchedulerService';
import { SlackService } from '../services/SlackService';
import { SenUpgradeJob } from '#server/jobs/SenUpgradeJob';

/**
 * Build the DI container for the app. This is used when building the container for jobs, but when
 * we are running the Express server, we also use src/server/express/config/container.ts which has
 * additional components.
 */
export function configureContainer(dataSource: DataSource): Container {
    const container = new Container();

    // Bind DataSource
    container.bind<DataSource>(TYPES.DataSource).toConstantValue(dataSource);

    // Bind Services
    container.bind<MarketplaceService>(TYPES.MarketplaceService).to(MarketplaceService).inSingletonScope();
    container.bind<AddonJob>(TYPES.AddonJob).to(AddonJob).inSingletonScope();
    container.bind<AddonDao>(TYPES.AddonDao).to(AddonDao).inSingletonScope();
    container.bind<TransactionJob>(TYPES.TransactionJob).to(TransactionJob).inSingletonScope();
    container.bind<LicenseJob>(TYPES.LicenseJob).to(LicenseJob).inSingletonScope();
    container.bind<PricingJob>(TYPES.PricingJob).to(PricingJob).inSingletonScope();
    container.bind<SenUpgradeJob>(TYPES.SenUpgradeJob).to(SenUpgradeJob).inSingletonScope();
    container.bind<PricingService>(TYPES.PricingService).to(PricingService).inSingletonScope();
    container.bind<ValidationJob>(TYPES.ValidationJob).to(ValidationJob).inSingletonScope();
    container.bind<PriceCalculatorService>(TYPES.PriceCalculatorService).to(PriceCalculatorService).inSingletonScope();
    container.bind<IgnoredFieldService>(TYPES.IgnoredFieldService).to(IgnoredFieldService).inSingletonScope();
    container.bind<TransactionDao>(TYPES.TransactionDao).to(TransactionDao).inSingletonScope();
    container.bind<TransactionReconcileDao>(TYPES.TransactionReconcileDao).to(TransactionReconcileDao).inSingletonScope();
    container.bind<LicenseDao>(TYPES.LicenseDao).to(LicenseDao).inSingletonScope();
    container.bind<TransactionAdjustmentDao>(TYPES.TransactionAdjustmentDao).to(TransactionAdjustmentDao).inSingletonScope();
    container.bind<ResellerDao>(TYPES.ResellerDao).to(ResellerDao).inSingletonScope();
    container.bind<PreviousTransactionService>(TYPES.PreviousTransactionService).to(PreviousTransactionService).inSingletonScope();
    container.bind<TransactionVersionDao>(TYPES.TransactionVersionDao).to(TransactionVersionDao).inSingletonScope();
    container.bind<TransactionValidationService>(TYPES.TransactionValidationService).to(TransactionValidationService).inSingletonScope();
    container.bind<TransactionSandboxService>(TYPES.TransactionSandboxService).to(TransactionSandboxService).inSingletonScope();
    container.bind<TransactionValidator>(TYPES.TransactionValidator).to(TransactionValidator).inSingletonScope();
    container.bind<TransactionAdjustmentValidationService>(TYPES.TransactionAdjustmentValidationService).to(TransactionAdjustmentValidationService).inSingletonScope();
    container.bind<TransactionDiffValidationService>(TYPES.TransactionDiffValidationService).to(TransactionDiffValidationService).inSingletonScope();
    container.bind<ConfigDao>(TYPES.ConfigDao).to(ConfigDao).inSingletonScope();
    container.bind<JobDao>(TYPES.JobDao).to(JobDao).inSingletonScope();
    container.bind<JobRunner>(TYPES.JobStarter).to(JobRunner).inSingletonScope();
    container.bind<LicenseVersionDao>(TYPES.LicenseVersionDao).to(LicenseVersionDao).inSingletonScope();
    container.bind<SchedulerService>(TYPES.SchedulerService).to(SchedulerService).inSingletonScope();
    container.bind<SlackService>(TYPES.SlackService).to(SlackService).inSingletonScope();

    return container;
}