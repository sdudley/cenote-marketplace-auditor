import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Transaction } from '../entities/Transaction';
import { TransactionVersion } from '../entities/TransactionVersion';
import { License } from '../entities/License';
import { LicenseVersion } from '../entities/LicenseVersion';
import { Addon } from '../entities/Addon';
import { Pricing } from '../entities/Pricing';
import { PricingInfo } from '../entities/PricingInfo';
import { AddGinIndexes1711234567890 } from '../migrations/1711234567890-AddGinIndexes';
import { UpdateExistingRecords1711234567891 } from '../migrations/1711234567891-UpdateExistingRecords';
import { InitializeIgnoredFields1711234567892 } from '../migrations/1711234567892-InitializeIgnoredFields';
import { IgnoredField } from '../entities/IgnoredField';

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
        TransactionVersion,
        License,
        LicenseVersion,
        Addon,
        Pricing,
        PricingInfo,
        IgnoredField
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