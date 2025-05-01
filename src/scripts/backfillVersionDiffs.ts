import 'dotenv/config';
import { DataSource } from 'typeorm';
import { LicenseVersion } from '../entities/LicenseVersion';
import { TransactionVersion } from '../entities/TransactionVersion';
import { computeJsonPaths, normalizeObject } from '../utils/objectUtils';
import { initializeDatabase } from '../config/database';

async function backfillVersionDiffs() {
    const dataSource = await initializeDatabase();
    const licenseVersionRepo = dataSource.getRepository(LicenseVersion);
    const transactionVersionRepo = dataSource.getRepository(TransactionVersion);

    console.log('Starting to backfill version diffs...');

    // Process license versions
    const licenseVersions = await licenseVersionRepo.find({
        relations: ['priorLicense'],
        order: { createdAt: 'ASC' }
    });

    console.log(`Found ${licenseVersions.length} license versions to process`);
    let licenseUpdatedCount = 0;

    for (const version of licenseVersions) {
        if (version.priorLicense) {
            const currentDataNorm = normalizeObject(version.data);
            const priorDataNorm = normalizeObject(version.priorLicense.data);

            const changedPaths = computeJsonPaths(priorDataNorm, currentDataNorm);
            if (changedPaths.length > 0) {
                version.diff = changedPaths.join(' | ');
                await licenseVersionRepo.save(version);
                licenseUpdatedCount++;
            }
        }
    }

    // Process transaction versions
    const transactionVersions = await transactionVersionRepo.find({
        relations: ['priorTransaction'],
        order: { createdAt: 'ASC' }
    });

    console.log(`Found ${transactionVersions.length} transaction versions to process`);
    let transactionUpdatedCount = 0;

    for (const version of transactionVersions) {
        if (version.priorTransaction) {
            const currentDataNorm = normalizeObject(version.data);
            const priorDataNorm = normalizeObject(version.priorTransaction.data);

            const changedPaths = computeJsonPaths(priorDataNorm, currentDataNorm);
            if (changedPaths.length > 0) {
                version.diff = changedPaths.join(' | ');
                await transactionVersionRepo.save(version);
                transactionUpdatedCount++;
            }
        }
    }

    console.log('Backfill completed:');
    console.log(`- Updated ${licenseUpdatedCount} license versions`);
    console.log(`- Updated ${transactionUpdatedCount} transaction versions`);

    await dataSource.destroy();
}

backfillVersionDiffs().catch(error => {
    console.error('Error during backfill:', error);
    process.exit(1);
});