import { Container } from 'inversify';
import { DataSource } from 'typeorm';
import { configureContainer as configureCommonContainer } from '../../config/container';
import { ApiRouter } from '../routes/api';
import { TransactionRoute } from '../routes/TransactionRoute';
import { EXPRESS_TYPES } from './expressTypes';

export function configureContainer(dataSource: DataSource): Container {
    const container = configureCommonContainer(dataSource);

    // Bind Express-specific dependencies
    container.bind<ApiRouter>(EXPRESS_TYPES.ApiRouter).to(ApiRouter).inSingletonScope();
    container.bind<TransactionRoute>(EXPRESS_TYPES.TransactionRoute).to(TransactionRoute).inSingletonScope();

    return container;
}