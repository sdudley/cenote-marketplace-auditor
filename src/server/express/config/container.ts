import { Container } from 'inversify';
import { DataSource } from 'typeorm';
import { configureContainer as configureCommonContainer } from '../../config/container';
import { ApiRouter } from '../routes/api';
import { TransactionRoute } from '../routes/TransactionRoute';
import { TransactionVersionRoute } from '../routes/TransactionVersionRoute';
import { EXPRESS_TYPES } from './expressTypes';
import { TransactionReconcileRoute } from '../routes/TransactionReconcileRoute';

export function configureContainer(dataSource: DataSource): Container {
    const container = configureCommonContainer(dataSource);

    // Bind Express-specific dependencies
    container.bind<ApiRouter>(EXPRESS_TYPES.ApiRouter).to(ApiRouter).inSingletonScope();
    container.bind<TransactionRoute>(EXPRESS_TYPES.TransactionRoute).to(TransactionRoute).inSingletonScope();
    container.bind<TransactionVersionRoute>(EXPRESS_TYPES.TransactionVersionRoute).to(TransactionVersionRoute).inSingletonScope();
    container.bind<TransactionReconcileRoute>(EXPRESS_TYPES.TransactionReconcileRoute).to(TransactionReconcileRoute).inSingletonScope();

    return container;
}