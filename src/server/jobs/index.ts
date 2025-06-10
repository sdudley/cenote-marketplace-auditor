import 'reflect-metadata';
import 'dotenv/config';
import { initializeDatabase } from '../config/database';
import { configureContainer } from '../config/container';
import { TYPES } from '../config/types';
import { JobStarter } from './JobStarter';

async function main() {
    const args = process.argv.slice(2);
    const flags = new Set(args);

    const dataSource = await initializeDatabase();
    const container = configureContainer(dataSource);

    // Parse start date if provided
    let startDate: string|undefined;
    const startDateArg = args.find(arg => arg.startsWith('--start-date='));
    if (startDateArg) {
        startDate = startDateArg.split('=')[1];
    }

    try {
        const jobStarter = container.get<JobStarter>(TYPES.JobStarter);

        if (flags.size === 0 || flags.has('--with-fetch-apps')) {
            await jobStarter.startAddonJob(true);
        }

        if (flags.size === 0 || flags.has('--with-pricing')) {
            await jobStarter.startPricingJob(true);
        }

        if (flags.size === 0 || flags.has('--with-transactions')) {
            console.log(`\n=== Fetching transactions ===`);
            await jobStarter.startTransactionJob(true);
        }

        if (flags.size === 0 || flags.has('--with-licenses')) {
            console.log(`\n=== Fetching licenses ===`);
            await jobStarter.startLicenseJob(true);
        }

        if (flags.size === 0 || flags.has('--validate-transactions')) {
            await jobStarter.startValidationJob(startDate, true);
        }
    } catch (e) {
        console.error('Unhandled error:', e);
        process.exit(1);
    } finally {
        if (dataSource) {
            await dataSource.destroy();
        }
        process.exit(0);
    }
}

main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});