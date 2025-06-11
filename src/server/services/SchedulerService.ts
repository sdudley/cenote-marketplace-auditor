import * as cron from 'node-cron';
import { injectable, inject } from 'inversify';
import { ConfigDao } from '#server/database/ConfigDao';
import { ConfigKey } from '#common/types/configItem';
import { JobStarter } from '../jobs/JobStarter';
import { TYPES } from '../config/types';

@injectable()
export class SchedulerService {
    private cronJob: cron.ScheduledTask | null = null;

    constructor(
        @inject(TYPES.ConfigDao) private readonly configDao: ConfigDao,
        @inject(TYPES.JobStarter) private readonly jobStarter: JobStarter
    ) {}

    public async initialize(): Promise<void> {
        await this.updateSchedule();
    }

    public async updateSchedule(): Promise<void> {
        // Stop existing job if it exists
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }

        // Get current frequency from config
        const frequency = await this.configDao.get<number>(ConfigKey.SchedulerFrequency) ?? 0;

        // If frequency is 0 or negative, scheduler is disabled
        if (frequency <= 0) {
            console.log('[SchedulerService] Scheduler is disabled');
            return;
        }

        // Create cron expression for every X hours
        const cronExpression = `0 0 */${frequency} * * *`;

        // Start new job
        this.cronJob = cron.schedule(cronExpression, async () => {
            try {
                console.log('[SchedulerService] Starting scheduled jobs');
                await this.jobStarter.startAllJobs();
            } catch (error) {
                console.error('[SchedulerService] Error in scheduled jobs:', error);
            }
        });

        console.log(`[SchedulerService] Scheduler initialized with frequency: ${frequency} hours`);
    }

    public isEnabled(): boolean {
        return this.cronJob !== null;
    }
}