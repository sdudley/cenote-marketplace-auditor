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
        PricingInfo
    ],
    subscribers: [],
    migrations: [AddGinIndexes1711234567890, UpdateExistingRecords1711234567891],
});

export async function initializeDatabase() {
    const dataSource = await AppDataSource.initialize();

    // Create GIN indexes after initialization
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS "IDX_transaction_data_gin" ON "transaction" USING GIN ("data");
        CREATE INDEX IF NOT EXISTS "IDX_transaction_version_data_gin" ON "transaction_version" USING GIN ("data");
        CREATE INDEX IF NOT EXISTS "IDX_license_data_gin" ON "license" USING GIN ("data");
        CREATE INDEX IF NOT EXISTS "IDX_license_version_data_gin" ON "license_version" USING GIN ("data");
    `);

    return dataSource;
}