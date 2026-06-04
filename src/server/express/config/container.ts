import { Container } from 'inversify';
import { DataSource } from 'typeorm';
import { configureContainer as configureCommonContainer } from '../../config/container.js';
import { ApiRouter } from '../routes/index.js';
import { TransactionRoute } from '../routes/TransactionRoute.js';
import { TransactionVersionRoute } from '../routes/TransactionVersionRoute.js';
import { EXPRESS_TYPES } from './expressTypes.js';
import { TransactionReconcileRoute } from '../routes/TransactionReconcileRoute.js';
import { ConfigRoute } from '../routes/ConfigRoute.js';
import { JobRoute } from '../routes/JobRoute.js';
import { LicenseRoute } from '../routes/LicenseRoute.js';
import { LicenseVersionRoute } from '../routes/LicenseVersionRoute.js';
import { SchedulerRoute } from '../routes/SchedulerRoute.js';
import { TransactionPricingRoute } from '../routes/TransactionPricingRoute.js';
import { AppRoute } from '../routes/AppRoutes.js';
import { AuthRoute } from '../routes/AuthRoute.js';
import { UserRoute } from '../routes/UserRoute.js';
import { ApportionmentRoute } from '../routes/ApportionmentRoute.js';

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
    container.bind<AuthRoute>(EXPRESS_TYPES.AuthRoute).to(AuthRoute).inSingletonScope();
    container.bind<UserRoute>(EXPRESS_TYPES.UserRoute).to(UserRoute).inSingletonScope();
    container.bind<ApportionmentRoute>(EXPRESS_TYPES.ApportionmentRoute).to(ApportionmentRoute).inSingletonScope();

    return container;
}