import 'dotenv/config';
import { Transaction } from '#common/entities/Transaction';
import { TransactionVersion } from '#common/entities/TransactionVersion';
import { License } from '#common/entities/License';
import { LicenseVersion } from '#common/entities/LicenseVersion';
import { initializeDatabase } from '../config/database';
import { computeJsonPaths } from '#common/util/objectUtils';

/**
 * WARNING: this script will mutate the updated_at field for all licenses and transactions.
 *
 */
async function backfillVersionNumbers() {
    const dataSource = await initializeDatabase();
    const transactionRepo = dataSource.getRepository(Transaction);
    const transactionVersionRepo = dataSource.getRepository(TransactionVersion);
    const licenseRepo = dataSource.getRepository(License);
    const licenseVersionRepo = dataSource.getRepository(LicenseVersion);

    console.log('Starting to backfill version numbers and version diffs...');

    // Process transaction versions
    const transactions = await transactionRepo.find();
    console.log(`Found ${transactions.length} transactions to process`);
    let transactionUpdatedCount = 0;

    for (const transaction of transactions) {
        // Get all versions ordered by creation date
        const versions = await transactionVersionRepo.find({
            where: { transaction: { id: transaction.id } },
            order: { createdAt: 'ASC' }
        });

        if (versions.length > 0) {
            // Rebuild version chain

            for (let i = 0; i < versions.length; i++) {
                const version = versions[i];
                version.version = i + 1;

                if (i > 0) {
                    const currentDataNorm = versions[i].data;
                    const priorDataNorm = versions[i-1].data;

                    const changedPaths = computeJsonPaths(priorDataNorm, currentDataNorm);

                    if (changedPaths.length > 0) {
                        version.diff = changedPaths.join(' | ');
                    }
                }

                await transactionVersionRepo.save(version);
            }

            // Update the transaction's currentVersion
            transaction.currentVersion = versions.length;
            await transactionRepo.save(transaction);
            transactionUpdatedCount++;
        }
    }

    // Process license versions
    const licenses = await licenseRepo.find();
    console.log(`Found ${licenses.length} licenses to process`);
    let licenseUpdatedCount = 0;

    for (const license of licenses) {
        // Get all versions ordered by creation date
        const versions = await licenseVersionRepo.find({
            where: { license: { id: license.id } },
            order: { createdAt: 'ASC' }
        });

        if (versions.length > 0) {

            // Rebuild version chain
            for (let i = 0; i < versions.length; i++) {
                const version = versions[i];
                version.version = i + 1;

                if (i > 0) {
                    const currentDataNorm = versions[i].data;
                    const priorDataNorm = versions[i-1].data;

                    const changedPaths = computeJsonPaths(priorDataNorm, currentDataNorm);

                    if (changedPaths.length > 0) {
                        version.diff = changedPaths.join(' | ');
                    }
                }

                await licenseVersionRepo.save(version);
            }

            // Update the license's currentVersion
            license.currentVersion = versions.length;
            await licenseRepo.save(license);
            licenseUpdatedCount++;
        }
    }

    console.log('Backfill completed:');
    console.log(`- Updated ${transactionUpdatedCount} transactions and their versions`);
    console.log(`- Updated ${licenseUpdatedCount} licenses and their versions`);

    await dataSource.destroy();
}

backfillVersionNumbers().catch(error => {
    console.error('Error during backfill:', error);
    process.exit(1);
});