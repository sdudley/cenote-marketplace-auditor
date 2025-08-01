import { Container } from 'inversify';
import { DataSource } from 'typeorm';
import { configureContainer as configureCommonContainer } from '../../config/container';
import { ApiRouter } from '../routes';
import { TransactionRoute } from '../routes/TransactionRoute';
import { TransactionVersionRoute } from '../routes/TransactionVersionRoute';
import { EXPRESS_TYPES } from './expressTypes';
import { TransactionReconcileRoute } from '../routes/TransactionReconcileRoute';
import { ConfigRoute } from '../routes/ConfigRoute';
import { JobRoute } from '../routes/JobRoute';
import { LicenseRoute } from '../routes/LicenseRoute';
import { LicenseVersionRoute } from '../routes/LicenseVersionRoute';
import { SchedulerRoute } from '../routes/SchedulerRoute';
import { TransactionPricingRoute } from '../routes/TransactionPricingRoute';
import { AppRoute } from '../routes/AppRoutes';

export function configureContainer(dataSource: DataSource): Container {
    const container = configureCommonContainer(dataSource);

    // Bind Express-specific dependencies
    container.bind<ApiRouter>(EXPRESS_TYPES.ApiRouter).to(ApiRouter).inSingletonScope();
    container.bind<TransactionRoute>(EXPRESS_TYPES.TransactionRoute).to(TransactionRoute).inSingletonScope();
    container.bind<TransactionVersionRoute>(EXPRESS_TYPES.TransactionVersionRoute).to(TransactionVersionRoute).inSingletonScope();
    container.bind<TransactionReconcileRoute>(EXPRESS_TYPES.TransactionReconcileRoute).to(TransactionReconcileRoute).inSingletonScope();
    container.bind<ConfigRoute>(EXPRESS_TYPES.ConfigRoute).to(ConfigRoute).inSingletonScope();
    container.bind<JobRoute>(EXPRESS_TYPES.JobRoute).to(JobRoute).inSingletonScope();
    container.bind<LicenseRoute>(EXPRESS_TYPES.LicenseRoute).to(LicenseRoute).inSingletonScope();
    container.bind<LicenseVersionRoute>(EXPRESS_TYPES.LicenseVersionRoute).to(LicenseVersionRoute).inSingletonScope();
    container.bind<SchedulerRoute>(EXPRESS_TYPES.SchedulerRoute).to(SchedulerRoute).inSingletonScope();
    container.bind<TransactionPricingRoute>(EXPRESS_TYPES.TransactionPricingRoute).to(TransactionPricingRoute).inSingletonScope();
    container.bind<AppRoute>(EXPRESS_TYPES.AppRoute).to(AppRoute).inSingletonScope();

    return container;
}