import { Container } from 'inversify';
import { DataSource } from 'typeorm';
import { configureContainer as configureCommonContainer } from '../../config/container';
import { ApiRouter } from '../routes/api';

export function configureContainer(dataSource: DataSource): Container {
    const container = configureCommonContainer(dataSource);

    // Bind Express-specific dependencies
    container.bind<ApiRouter>('ApiRouter').to(ApiRouter).inSingletonScope();

    return container;
}