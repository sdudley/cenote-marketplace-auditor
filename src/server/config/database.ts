import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Transaction } from '@common/entities/Transaction';
import { TransactionVersion } from '@common/entities/TransactionVersion';
import { License } from '@common/entities/License';
import { LicenseVersion } from '@common/entities/LicenseVersion';
import { Addon } from '@common/entities/Addon';
import { Pricing } from '@common/entities/Pricing';
import { PricingInfo } from '@common/entities/PricingInfo';
import { AddGinIndexes1711234567890 } from '../database/migrations/1711234567890-AddGinIndexes';
import { UpdateExistingRecords1711234567891 } from '../database/migrations/1711234567891-UpdateExistingRecords';
import { InitializeIgnoredFields1711234567892 } from '../database/migrations/1711234567892-InitializeIgnoredFields';
import { IgnoredField } from '@common/entities/IgnoredField';
import { TransactionReconcile } from '@common/entities/TransactionReconcile';
import { Reseller } from '@common/entities/Reseller';
import { TransactionAdjustment } from '@common/entities/TransactionAdjustment';

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'marketplace_auditor',
    synchronize: true,
    logging: false,
    namingStrategy: new SnakeNamingStrategy(),
    entities: [
        Transaction,
        TransactionAdjustment,
        TransactionVersion,
        License,
        LicenseVersion,
        Addon,
        Pricing,
        PricingInfo,
        Reseller,
        IgnoredField,
        TransactionReconcile
    ],
    subscribers: [],
    migrations: [
        AddGinIndexes1711234567890,
        UpdateExistingRecords1711234567891,
        InitializeIgnoredFields1711234567892
    ],
});

export async function initializeDatabase() {
    const dataSource = await AppDataSource.initialize();

    // Run migrations
    await dataSource.runMigrations();

    return dataSource;
}