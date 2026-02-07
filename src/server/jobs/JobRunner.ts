import { injectable, inject } from 'inversify';
import { TYPES } from '../config/types';
import { AddonJob } from './AddonJob';
import { TransactionJob } from './TransactionJob';
import { LicenseJob } from './LicenseJob';
import { PricingJob } from './PricingJob';
import { ValidationJob } from './ValidationJob';
import { MarketplaceService } from '../services/MarketplaceService';
import { JobType } from '#common/entities/JobStatus';
import { JobDao } from '#server/database/dao/JobDao';

@injectable()
export class JobRunner {
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
            let stream: Awaited<ReturnType<typeof this.marketplaceService.getTransactionsStream>> | null = null;
            try {
                stream = await this.marketplaceService.getTransactionsStream();
                const onProgress = (current: number, total?: number) =>
                    this.jobDao.updateJobProgress(JobType.TransactionJob, current, total);
                await this.transactionJob.processTransactionsFromStream(stream, onProgress);
            } finally {
                stream?.destroy();
            }
        });
    }

    public startLicenseJob(runSync: boolean = false): Promise<void> {
        const runner = this.getRunner(runSync);

        return runner(JobType.LicenseJob, async () => {
            let streams: Awaited<ReturnType<typeof this.marketplaceService.getLicensesStreams>> = [];
            try {
                streams = await this.marketplaceService.getLicensesStreams();
                const onProgress = (current: number, total?: number) =>
                    this.jobDao.updateJobProgress(JobType.LicenseJob, current, total);
                await this.licenseJob.processLicensesFromStreams(streams, onProgress);
            } finally {
                streams.forEach(s => s.destroy());
            }
        });
    }

    public startValidationJob(startDate?: string, runSync: boolean = false): Promise<void> {
        const runner = this.getRunner(runSync);

        return runner(JobType.ValidationJob, async () => {
            const onProgress = (current: number, total: number) =>
                this.jobDao.updateJobProgress(JobType.ValidationJob, current, total);
            await this.validationJob.validateTransactions(startDate, onProgress);
        });
    }

    async startAllJobs(): Promise<{ job: string, success: boolean, error?: string }[]> {
        const results: { job: string, success: boolean, error?: string }[] = [];
        try {
            // 1. Fetch Apps
            try {
                await this.startAddonJob(true);
                results.push({ job: 'Fetch Apps', success: true });
            } catch (e: any) {
                results.push({ job: 'Fetch Apps', success: false, error: e?.message || String(e) });
                return results;
            }
            // 2. Fetch App Pricing
            try {
                await this.startPricingJob(true);
                results.push({ job: 'Fetch App Pricing', success: true });
            } catch (e: any) {
                results.push({ job: 'Fetch App Pricing', success: false, error: e?.message || String(e) });
                return results;
            }
            // 3. Fetch Transactions
            try {
                await this.startTransactionJob(true);
                results.push({ job: 'Fetch Transactions', success: true });
            } catch (e: any) {
                results.push({ job: 'Fetch Transactions', success: false, error: e?.message || String(e) });
                return results;
            }
            // 4. Fetch Licenses
            try {
                await this.startLicenseJob(true);
                results.push({ job: 'Fetch Licenses', success: true });
            } catch (e: any) {
                results.push({ job: 'Fetch Licenses', success: false, error: e?.message || String(e) });
                return results;
            }
            // 5. Validate Transactions
            try {
                await this.startValidationJob(undefined, true);
                results.push({ job: 'Validate Transactions', success: true });
            } catch (e: any) {
                results.push({ job: 'Validate Transactions', success: false, error: e?.message || String(e) });
                return results;
            }
            return results;
        } catch (error) {
            return results;
        }
    }
}