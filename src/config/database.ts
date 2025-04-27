import { DataSource } from 'typeorm';
import { Transaction } from '../entities/Transaction';
import { TransactionVersion } from '../entities/TransactionVersion';
import { License } from '../entities/License';
import { LicenseVersion } from '../entities/LicenseVersion';

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: true,
    logging: false,
    entities: [Transaction, TransactionVersion, License, LicenseVersion],
    subscribers: [],
    migrations: [],
});

export async function initializeDatabase() {
    await AppDataSource.initialize();

    // Create GIN indexes after initialization
    await AppDataSource.query(`
        CREATE INDEX IF NOT EXISTS "IDX_transaction_currentData_gin" ON "transaction" USING GIN ("currentData");
        CREATE INDEX IF NOT EXISTS "IDX_transaction_version_data_gin" ON "transaction_version" USING GIN ("data");
        CREATE INDEX IF NOT EXISTS "IDX_license_currentData_gin" ON "license" USING GIN ("currentData");
        CREATE INDEX IF NOT EXISTS "IDX_license_version_data_gin" ON "license_version" USING GIN ("data");
    `);
}