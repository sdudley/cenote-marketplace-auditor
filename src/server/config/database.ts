import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Transaction } from '#common/entities/Transaction';
import { TransactionVersion } from '#common/entities/TransactionVersion';
import { License } from '#common/entities/License';
import { LicenseVersion } from '#common/entities/LicenseVersion';
import { Addon } from '#common/entities/Addon';
import { Pricing } from '#common/entities/Pricing';
import { PricingInfo } from '#common/entities/PricingInfo';
import { AddGinIndexes1711234567890 } from '../database/migrations/1711234567890-AddGinIndexes';
import { UpdateExistingRecords1711234567891 } from '../database/migrations/1711234567891-UpdateExistingRecords';
import { InitializeIgnoredFields1711234567892 } from '../database/migrations/1711234567892-InitializeIgnoredFields';
import { IgnoredField } from '#common/entities/IgnoredField';
import { TransactionReconcile } from '#common/entities/TransactionReconcile';
import { Reseller } from '#common/entities/Reseller';
import { TransactionAdjustment } from '#common/entities/TransactionAdjustment';
import { assert } from 'console';
import { TransactionReconcileNote } from '#common/entities/TransactionReconcileNote';
import { Config } from '#common/entities/Config';
import { JobStatus } from '#common/entities/JobStatus';

function assertString(value: string | undefined, name: string): asserts value is string {
    if (typeof value !== 'string') {
        throw new Error(`${name} must be a string`);
    }
}

assert(process.env.DB_HOST, 'DB_HOST is not set');
assert(process.env.DB_USERNAME, 'DB_USERNAME is not set');
assert(process.env.DB_PASSWORD, 'DB_PASSWORD is not set');
assert(process.env.DB_DATABASE, 'DB_DATABASE is not set');
assertString(process.env.DB_PORT, 'DB_PORT');

const databaseLogging = process.env.DB_LOGGING === 'true';

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: true,
    logging: databaseLogging,
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
        TransactionReconcile,
        TransactionReconcileNote,
        Config,
        JobStatus
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