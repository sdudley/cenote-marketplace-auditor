import { Container } from 'inversify';
import { DataSource } from 'typeorm';
import { MarketplaceService } from '../services/MarketplaceService.js';
import { AddonJob } from '../jobs/AddonJob.js';
import { TransactionJob } from '../jobs/TransactionJob.js';
import { LicenseJob } from '../jobs/LicenseJob.js';
import { PricingJob } from '../jobs/PricingJob.js';
import { ValidationJob } from '../jobs/ValidationJob.js';
import { PriceCalculatorService } from '../services/PriceCalculatorService.js';
import { IgnoredFieldService } from '../services/IgnoredFieldService.js';
import { TransactionDao } from '../database/dao/TransactionDao.js';
import { LicenseDao } from '../database/dao/LicenseDao.js';
import { TransactionReconcileDao } from '../database/dao/TransactionReconcileDao.js';
import { TYPES } from './types.js';
import { TransactionAdjustmentDao } from '../database/dao/TransactionAdjustmentDao.js';
import { ResellerDao } from '../database/dao/ResellerDao.js';
import { PreviousTransactionService } from '../services/PreviousTransactionService.js';
import { AddonDao } from '../database/dao/AddonDao.js';
import { PricingDao } from '../database/dao/PricingDao.js';
import { PricingService } from '../services/PricingService.js';
import { TransactionVersionDao } from '#server/database/dao/TransactionVersionDao.js';
import { TransactionValidationService } from '#server/services/transactionValidation/TransactionValidationService.js';
import { TransactionSandboxService } from '#server/services/transactionValidation/TransactionSandboxService.js';
import { TransactionValidator } from '#server/services/transactionValidation/TransactionValidator.js';
import { TransactionAdjustmentValidationService } from '#server/services/transactionValidation/TransactionAdjustmentValidationService.js';
import { TransactionDiffValidationService } from '#server/services/transactionValidation/TransactionDiffValidationService.js';
import { ConfigDao } from '../database/dao/ConfigDao.js';
import { JobDao } from '../database/dao/JobDao.js';
import { JobRunner } from '../jobs/JobRunner.js';
import { LicenseVersionDao } from '../database/dao/LicenseVersionDao.js';
import { SchedulerService } from '../services/SchedulerService.js';
import { SlackService } from '../services/SlackService.js';
import { UserDao } from '../database/dao/UserDao.js';
import { ApportionmentService } from '../services/ApportionmentService.js';

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
    container.bind<PricingDao>(TYPES.PricingDao).to(PricingDao).inSingletonScope();
    container.bind<TransactionJob>(TYPES.TransactionJob).to(TransactionJob).inSingletonScope();
    container.bind<LicenseJob>(TYPES.LicenseJob).to(LicenseJob).inSingletonScope();
    container.bind<PricingJob>(TYPES.PricingJob).to(PricingJob).inSingletonScope();
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
    container.bind<UserDao>(TYPES.UserDao).to(UserDao).inSingletonScope();
    container.bind<ApportionmentService>(TYPES.ApportionmentService).to(ApportionmentService).inSingletonScope();

    return container;
}