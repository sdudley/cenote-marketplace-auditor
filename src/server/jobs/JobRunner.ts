import { inject } from 'inversify';
import { JobDao } from '../database/JobDao';
import { TYPES } from '#server/config/types';
import { JobType } from '#common/entities/JobStatus';

export class JobRunner {
    constructor(
        @inject(TYPES.JobDao) private jobDao: JobDao
    ) {
    }

    async runJob(jobType: JobType, task: () => Promise<void>) : Promise<void> {
        await this.jobDao.recordJobStarted(jobType);

        try {
            await task();
        } catch (error) {
            await this.jobDao.recordJobFinished(jobType, false, error instanceof Error ? error.message : String(error));
            return;
        }

        await this.jobDao.recordJobFinished(jobType, true);
    }
}