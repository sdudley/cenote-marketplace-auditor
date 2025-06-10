import { Router } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types';
import { JobDao } from '../../database/JobDao';
import { JobStatus, JobType } from '#common/entities/JobStatus';

interface JobStatusResponse {
    jobType: JobType;
    lastStartTime: Date | null;
    lastEndTime: Date | null;
    lastSuccess: boolean | null;
    lastError: string | null;
}

@injectable()
export class JobRoute {
    private router: Router;

    constructor(
        @inject(TYPES.JobDao) private jobDao: JobDao
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
            lastError: status.lastError ?? null
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

                // Record that the job has started
                await this.jobDao.recordJobStarted(jobType);

                // TODO: Start the actual job
                // This will be implemented when we build the job runner
                console.log(`Starting job: ${jobType}`);

                res.status(202).json({
                    message: 'Job started',
                    jobType
                });
            } catch (error) {
                console.error('Error starting job:', error);
                res.status(500).json({ error: 'Failed to start job' });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}