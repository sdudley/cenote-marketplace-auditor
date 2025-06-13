import { injectable, inject } from 'inversify';
import { DataSource, Repository, Not, IsNull } from 'typeorm';
import { TYPES } from '../../config/types';
import { JobStatus, JobType } from '#common/entities/JobStatus';

@injectable()
export class JobDao {
    private repository: Repository<JobStatus>;

    constructor(
        @inject(TYPES.DataSource) dataSource: DataSource
    ) {
        this.repository = dataSource.getRepository(JobStatus);
    }

    /**
     * Records application start by clearing any pending job statuses
     * This should be called when the application starts to ensure no jobs are marked as running
     */
    async recordApplicationStart(): Promise<void> {
        // Find all jobs that appear to be running (have start time but no end time)
        const runningJobs = await this.repository.find({
            where: {
                lastStartTime: Not(IsNull()),
                lastEndTime: IsNull()
            }
        });

        // Update each running job to mark it as failed with an error message
        for (const job of runningJobs) {
            job.lastEndTime = null;
            job.lastStartTime = null;
            job.lastSuccess = false;
            job.lastError = null;
            await this.repository.save(job);
        }
    }

    /**
     * Records that a job has started
     */
    async recordJobStarted(jobType: JobType): Promise<void> {
        let jobStatus = await this.repository.findOne({ where: { jobType } });

        if (!jobStatus) {
            jobStatus = new JobStatus();
            jobStatus.jobType = jobType;
        }

        jobStatus.lastStartTime = new Date();
        jobStatus.lastEndTime = null;
        jobStatus.lastSuccess = null;
        jobStatus.lastError = null;

        await this.repository.save(jobStatus);
    }

    /**
     * Records that a job has finished, either successfully or with an error
     */
    async recordJobFinished(jobType: JobType, success: boolean, error?: string): Promise<void> {
        const jobStatus = await this.repository.findOne({ where: { jobType } });
        if (!jobStatus) {
            throw new Error(`No job status found for job type: ${jobType}`);
        }

        jobStatus.lastEndTime = new Date();
        jobStatus.lastSuccess = success;
        jobStatus.lastError = error;

        await this.repository.save(jobStatus);
    }

    /**
     * Fetches the current status of a specific job
     */
    async getJobStatus(jobType: JobType): Promise<JobStatus | null> {
        return this.repository.findOne({ where: { jobType } });
    }

    async isJobRunning(jobType: JobType): Promise<boolean> {
        const jobStatus = await this.getJobStatus(jobType);
        return jobStatus?.lastStartTime !== null && jobStatus?.lastEndTime === null;
    }

    /**
     * Fetches the status of all jobs
     */
    async getAllJobStatuses(): Promise<JobStatus[]> {
        return this.repository.find();
    }
}