import 'reflect-metadata';
import 'dotenv/config';
import { initializeDatabase } from '../config/database';
import { configureContainer } from '../config/container';
import { TYPES } from '../config/types';
import { MarketplaceService } from '../services/MarketplaceService';
import { AddonJob } from './AddonJob';
import { TransactionJob } from './TransactionJob';
import { LicenseJob } from './LicenseJob';
import { PricingJob } from './PricingJob';
import { ValidationJob } from './ValidationJob';
import { JobRunner } from './JobRunner';
import { JobType } from '#common/entities/JobStatus';


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
        const marketplaceService = container.get<MarketplaceService>(TYPES.MarketplaceService);
        const jobRunner = container.get<JobRunner>(TYPES.JobRunner);

        if (flags.size === 0 || flags.has('--with-fetch-apps')) {
            const addonJob = container.get<AddonJob>(TYPES.AddonJob);
            await jobRunner.runJob(JobType.AddonJob, () => addonJob.syncAddonKeys());
        }

        if (flags.size === 0 || flags.has('--with-pricing')) {
            const pricingJob = container.get<PricingJob>(TYPES.PricingJob);
            await jobRunner.runJob(JobType.PricingJob, () => pricingJob.fetchPricing());
        }

        if (flags.size === 0 || flags.has('--with-transactions')) {
            console.log(`\n=== Fetching transactions ===`);

            await jobRunner.runJob(JobType.TransactionJob, async () => {
                const transactions = await marketplaceService.getTransactions();
                const transactionJob = container.get<TransactionJob>(TYPES.TransactionJob);
                await transactionJob.processTransactions(transactions);
            });
        }

        if (flags.size === 0 || flags.has('--with-licenses')) {
            console.log(`\n=== Fetching licenses ===`);

            await jobRunner.runJob(JobType.LicenseJob, async () => {
                const licenses = await marketplaceService.getLicenses();
                const licenseJob = container.get<LicenseJob>(TYPES.LicenseJob);
                await licenseJob.processLicenses(licenses);
            });
        }

        if (flags.size === 0 || flags.has('--validate-transactions')) {
            const validationJob = container.get<ValidationJob>(TYPES.ValidationJob);
            await jobRunner.runJob(JobType.ValidationJob, () => validationJob.validateTransactions(startDate));
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