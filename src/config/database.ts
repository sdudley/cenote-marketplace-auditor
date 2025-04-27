import { DataSource } from 'typeorm';
import { Transaction } from '../entities/Transaction';
import { TransactionVersion } from '../entities/TransactionVersion';
import { License } from '../entities/License';
import { LicenseVersion } from '../entities/LicenseVersion';
import { Addon } from '../entities/Addon';
import { Pricing } from '../entities/Pricing';
import { PricingInfo } from '../entities/PricingInfo';

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'marketplace_auditor',
    synchronize: true,
    logging: false,
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
    migrations: [],
});

export async function initializeDatabase() {
    const dataSource = await AppDataSource.initialize();

    // Create GIN indexes after initialization
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS "IDX_transaction_currentData_gin" ON "transaction" USING GIN ("currentData");
        CREATE INDEX IF NOT EXISTS "IDX_transaction_version_data_gin" ON "transaction_version" USING GIN ("data");
        CREATE INDEX IF NOT EXISTS "IDX_license_currentData_gin" ON "license" USING GIN ("currentData");
        CREATE INDEX IF NOT EXISTS "IDX_license_version_data_gin" ON "license_version" USING GIN ("data");
    `);

    return dataSource;
}