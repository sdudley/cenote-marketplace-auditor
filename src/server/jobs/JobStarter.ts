import { injectable, inject } from 'inversify';
import { TYPES } from '../config/types';
import { AddonJob } from './AddonJob';
import { TransactionJob } from './TransactionJob';
import { LicenseJob } from './LicenseJob';
import { PricingJob } from './PricingJob';
import { ValidationJob } from './ValidationJob';
import { MarketplaceService } from '../services/MarketplaceService';
import { JobType } from '#common/entities/JobStatus';
import { JobDao } from '#server/database/JobDao';

@injectable()
export class JobStarter {
    constructor(
        @inject(TYPES.AddonJob) private addonJob: AddonJob,
        @inject(TYPES.TransactionJob) private transactionJob: TransactionJob,
        @inject(TYPES.LicenseJob) private licenseJob: LicenseJob,
        @inject(TYPES.PricingJob) private pricingJob: PricingJob,
        @inject(TYPES.ValidationJob) private validationJob: ValidationJob,
        @inject(TYPES.MarketplaceService) private marketplaceService: MarketplaceService,
        @inject(TYPES.JobDao) private jobDao: JobDao
    ) {}

    private async runJob(jobType: JobType, jobFn: () => Promise<void>): Promise<void> {
        if (await this.jobDao.isJobRunning(jobType)) {
            console.log(`Job ${jobType} is already running; skipping.`);
            return;
        }

        await this.jobDao.recordJobStarted(jobType);

        try {
            await jobFn();
            await this.jobDao.recordJobFinished(jobType, true);
        } catch (error) {
            await this.jobDao.recordJobFinished(jobType, false, error instanceof Error ? error.message : String(error));
            throw error;
        }
    }

    private runJobSafelyAsync(jobType: JobType, jobFn: () => Promise<void>): Promise<void> {
        this.runJob(jobType, jobFn)
            .catch(error => console.error(`Error running ${jobType}:`, error));

        return Promise.resolve(void 0);
    }

    private runJobSafelySync(jobType: JobType, jobFn: () => Promise<void>): Promise<void> {
        return this.runJob(jobType, jobFn);
    }

    private getRunner(runSync: boolean): (jobType: JobType, jobFn: () => Promise<void>) => Promise<void> {
        return runSync ? this.runJobSafelySync.bind(this) : this.runJobSafelyAsync.bind(this);
    }

    public startAddonJob(runSync: boolean = false): Promise<void> {
        const runner = this.getRunner(runSync);
        return runner(JobType.AddonJob, () => this.addonJob.syncAddonKeys());
    }

    public startPricingJob(runSync: boolean = false): Promise<void> {
        const runner = this.getRunner(runSync);
        return runner(JobType.PricingJob, () => this.pricingJob.fetchPricing());
    }

    public startTransactionJob(runSync: boolean = false): Promise<void> {
        const runner = this.getRunner(runSync);

        return runner(JobType.TransactionJob, async () => {
            const transactions = await this.marketplaceService.getTransactions();
            await this.transactionJob.processTransactions(transactions);
        });
    }

    public startLicenseJob(runSync: boolean = false): Promise<void> {
        const runner = this.getRunner(runSync);

        return runner(JobType.LicenseJob, async () => {
            const licenses = await this.marketplaceService.getLicenses();
            await this.licenseJob.processLicenses(licenses);
        });
    }

    public startValidationJob(startDate?: string, runSync: boolean = false): Promise<void> {
        const runner = this.getRunner(runSync);

        return runner(JobType.ValidationJob, async () =>
            await this.validationJob.validateTransactions(startDate)
        );
    }
}