import { Router } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types';
import { JobDao } from '../../database/dao/JobDao';
import { JobStatus, JobType } from '#common/entities/JobStatus';
import { JobRunner } from '../../jobs/JobRunner';

interface JobStatusResponse {
    jobType: JobType;
    lastStartTime: Date | null;
    lastEndTime: Date | null;
    lastSuccess: boolean | null;
    lastError: string | null;
    progressCurrent: number | null;
    progressTotal: number | null;
}

@injectable()
export class JobRoute {
    private router: Router;

    constructor(
        @inject(TYPES.JobDao) private jobDao: JobDao,
        @inject(TYPES.JobStarter) private jobStarter: JobRunner
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private toResponse(status: JobStatus): JobStatusResponse {
        return {
            jobType: status.jobType,
            lastStartTime: status.lastStartTime ?? null,
            lastEndTime: status.lastEndTime ?? null,
            lastSuccess: status.lastSuccess ?? null,
            lastError: status.lastError ?? null,
            progressCurrent: status.progressCurrent ?? null,
            progressTotal: status.progressTotal ?? null
        };
    }

    private initializeRoutes(): void {
        // Get status of all jobs
        this.router.get('/', async (req, res) => {
            try {
                const statuses = await this.jobDao.getAllJobStatuses();
                res.json(statuses.map(status => this.toResponse(status)));
            } catch (error) {
                console.error('Error fetching job statuses:', error);
                res.status(500).json({ error: 'Failed to fetch job statuses' });
            }
        });

        // Get status of a specific job
        this.router.get('/:jobType', async (req, res) => {
            try {
                const jobType = req.params.jobType as JobType;
                if (!Object.values(JobType).includes(jobType)) {
                    return res.status(400).json({ error: 'Invalid job type' });
                }

                const status = await this.jobDao.getJobStatus(jobType);
                if (!status) {
                    return res.status(404).json({ error: 'Job status not found' });
                }

                res.json(this.toResponse(status));
            } catch (error) {
                console.error('Error fetching job status:', error);
                res.status(500).json({ error: 'Failed to fetch job status' });
            }
        });

        // Start a job
        this.router.post('/:jobType/start', async (req, res) => {
            try {
                const jobType = req.params.jobType as JobType;
                if (!Object.values(JobType).includes(jobType)) {
                    return res.status(400).json({ error: 'Invalid job type' });
                }

                // Check if job is already running
                const status = await this.jobDao.getJobStatus(jobType);
                if (status?.lastStartTime && !status.lastEndTime) {
                    return res.status(409).json({
                        error: 'Job is already running',
                        status: this.toResponse(status)
                    });
                }

                console.log(`Starting job: ${jobType}`);

                // Start the actual job using JobStarter (async version, not awaited)
                switch (jobType) {
                    case JobType.AddonJob:
                        this.jobStarter.startAddonJob(false);
                        break;
                    case JobType.PricingJob:
                        this.jobStarter.startPricingJob(false);
                        break;
                    case JobType.TransactionJob:
                        this.jobStarter.startTransactionJob(false);
                        break;
                    case JobType.LicenseJob:
                        this.jobStarter.startLicenseJob(false);
                        break;
                    case JobType.ValidationJob:
                        this.jobStarter.startValidationJob(undefined, false);
                        break;
                    default:
                        return res.status(400).json({ error: 'Invalid job type' });
                }

                res.status(202).json({
                    message: 'Job started',
                    jobType
                });
            } catch (error) {
                console.error('Error starting job:', error);
                res.status(500).json({ error: 'Failed to start job' });
            }
        });

        // Start all jobs synchronously in the correct order
        this.router.post('/start-all', async (req, res) => {
            console.log(`Starting all jobs`);

            this.jobStarter.startAllJobs().then(results => {
                const allSuccessful = results.every(r => r.success);
                if (allSuccessful) {
                    console.log('All jobs finished successfully', results);
                } else {
                    console.log('Failed to finish all jobs', results);
                }
            }).catch(error => {
                return res.status(500).json({ message: 'Unexpected error starting all jobs', error: (error as Error).message });
            });
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}