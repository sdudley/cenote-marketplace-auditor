import 'dotenv/config';
import { LicenseVersion } from '../../common/entities/LicenseVersion';
import { TransactionVersion } from '../../common/entities/TransactionVersion';
import { computeJsonPaths, normalizeObject } from '../../common/utils/objectUtils';
import { initializeDatabase } from '../../common/config/database';

async function backfillVersionDiffs() {
    const dataSource = await initializeDatabase();
    const licenseVersionRepo = dataSource.getRepository(LicenseVersion);
    const transactionVersionRepo = dataSource.getRepository(TransactionVersion);

    console.log('Starting to backfill version diffs...');

    // Process license versions
    const licenseVersions = await licenseVersionRepo.find({
        relations: ['priorLicenseVersion'],
        order: { createdAt: 'ASC' }
    });

    console.log(`Found ${licenseVersions.length} license versions to process`);
    let licenseUpdatedCount = 0;

    for (const version of licenseVersions) {
        if (version.priorLicenseVersion) {
            const currentDataNorm = normalizeObject(version.data);
            const priorDataNorm = normalizeObject(version.priorLicenseVersion.data);

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
        relations: ['priorTransactionVersion'],
        order: { createdAt: 'ASC' }
    });

    console.log(`Found ${transactionVersions.length} transaction versions to process`);
    let transactionUpdatedCount = 0;

    for (const version of transactionVersions) {
        if (version.priorTransactionVersion) {
            const currentDataNorm = normalizeObject(version.data);
            const priorDataNorm = normalizeObject(version.priorTransactionVersion.data);

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