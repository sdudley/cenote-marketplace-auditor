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
import { TransactionDao } from '../database/TransactionDao';
import { LicenseDao } from '../database/LicenseDao';
import { TransactionReconcileDao } from '../database/TransactionReconcileDao';
import { TYPES } from './types';
import { TransactionAdjustmentDao } from '../database/TransactionAdjustmentDao';
import { ResellerDao } from '../database/ResellerDao';
import { PreviousTransactionService } from '../services/PreviousTransactionService';
import { AddonService } from '../services/AddonService';
import { PricingService } from '../services/PricingService';
import { TransactionVersionDao } from '#server/database/TransactionVersionDao';
import { TransactionValidationService } from '#server/services/transactionValidation/TransactionValidationService';
import { TransactionSandboxService } from '#server/services/transactionValidation/TransactionSandboxService';
import { TransactionValidator } from '#server/services/transactionValidation/TransactionValidator';
import { TransactionAdjustmentValidationService } from '#server/services/transactionValidation/TransactionAdjustmentValidationService';
import { TransactionDiffValidationService } from '#server/services/transactionValidation/TransactionDiffValidationService';
import { ConfigDao } from '../database/ConfigDao';
import { JobDao } from '../database/JobDao';
import { JobStarter } from '../jobs/JobStarter';
import { LicenseVersionDao } from '../database/LicenseVersionDao';

export function configureContainer(dataSource: DataSource): Container {
    const container = new Container();

    // Bind DataSource
    container.bind<DataSource>(TYPES.DataSource).toConstantValue(dataSource);

    // Bind Services
    container.bind<MarketplaceService>(TYPES.MarketplaceService).to(MarketplaceService).inSingletonScope();
    container.bind<AddonJob>(TYPES.AddonJob).to(AddonJob).inSingletonScope();
    container.bind<AddonService>(TYPES.AddonService).to(AddonService).inSingletonScope();
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
    container.bind<JobStarter>(TYPES.JobStarter).to(JobStarter).inSingletonScope();
    container.bind<LicenseVersionDao>(TYPES.LicenseVersionDao).to(LicenseVersionDao).inSingletonScope();

    return container;
}