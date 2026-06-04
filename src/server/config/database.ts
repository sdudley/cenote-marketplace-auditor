import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Transaction } from '#common/entities/Transaction.js';
import { TransactionVersion } from '#common/entities/TransactionVersion.js';
import { License } from '#common/entities/License.js';
import { LicenseVersion } from '#common/entities/LicenseVersion.js';
import { Addon } from '#common/entities/Addon.js';
import { Pricing } from '#common/entities/Pricing.js';
import { PricingInfo } from '#common/entities/PricingInfo.js';
import { AddGinIndexes1711234567890 } from '../database/migrations/1711234567890-AddGinIndexes.js';
import { UpdateExistingRecords1711234567891 } from '../database/migrations/1711234567891-UpdateExistingRecords.js';
import { InitializeIgnoredFields1711234567892 } from '../database/migrations/1711234567892-InitializeIgnoredFields.js';
import { AddAddonForgeColumns1711234567893 } from '../database/migrations/1711234567893-AddAddonForgeColumns.js';
import { AddAddonProductId1711234567894 } from '../database/migrations/1711234567894-AddAddonProductId.js';
import { IgnoredField } from '#common/entities/IgnoredField.js';
import { TransactionReconcile } from '#common/entities/TransactionReconcile.js';
import { Reseller } from '#common/entities/Reseller.js';
import { TransactionAdjustment } from '#common/entities/TransactionAdjustment.js';
import { assert } from 'console';
import { TransactionReconcileNote } from '#common/entities/TransactionReconcileNote.js';
import { Config } from '#common/entities/Config.js';
import { JobStatus } from '#common/entities/JobStatus.js';
import { User } from '#common/entities/User.js';

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
    synchronize: false,
    migrationsRun: false,
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
        JobStatus,
        User
    ],
    subscribers: [],
    migrations: [
        AddGinIndexes1711234567890,
        UpdateExistingRecords1711234567891,
        InitializeIgnoredFields1711234567892,
        AddAddonForgeColumns1711234567893,
        AddAddonProductId1711234567894
    ],
});

async function isApplicationSchemaPresent(dataSource: DataSource): Promise<boolean> {
    const result = await dataSource.query<Array<{ exists: boolean }>>(`
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'transaction'
        ) AS "exists"
    `);
    return result[0]?.exists === true;
}

export async function initializeDatabase() {
    const dataSource = await AppDataSource.initialize();

    if (!await isApplicationSchemaPresent(dataSource)) {
        console.log('[database] Empty database detected; creating schema from entities.');
        await dataSource.synchronize();
    }

    await dataSource.runMigrations();

    return dataSource;
}
