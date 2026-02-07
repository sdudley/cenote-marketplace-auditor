import React, { useEffect, useState } from 'react';
import { Typography, CircularProgress, Alert, Box } from '@mui/material';
import { PlayArrow, CheckCircle, Error as ErrorIcon, Schedule } from '@mui/icons-material';
import { JobType } from '#common/entities/JobStatus';
import { PageContainer, PageTitle } from '../styles';
import { JobList, JobCard, JobInfo, JobStatus, StartAllButton, StartJobButton } from './styles';

interface JobStatusResponse {
    jobType: JobType;
    lastStartTime: Date | null;
    lastEndTime: Date | null;
    lastSuccess: boolean | null;
    lastError: string | null;
    progressCurrent: number | null;
    progressTotal: number | null;
}

interface Job {
    type: JobType;
    name: string;
    status: JobStatusResponse | null;
    isRunning: boolean;
}

const JOBS: Job[] = [
    { type: JobType.AddonJob, name: 'Fetch Apps', status: null, isRunning: false },
    { type: JobType.PricingJob, name: 'Fetch App Pricing', status: null, isRunning: false },
    { type: JobType.TransactionJob, name: 'Fetch Transactions', status: null, isRunning: false },
    { type: JobType.LicenseJob, name: 'Fetch Licenses', status: null, isRunning: false },
    { type: JobType.ValidationJob, name: 'Validate Transactions', status: null, isRunning: false }
];

const formatRunDate = (job: Job) => {
    let progressSuffix = '';
    if (job.status?.progressCurrent != null) {
        progressSuffix =
            job.status.progressTotal != null
                ? ` (${job.status.progressCurrent} out of ${job.status.progressTotal})`
                : ` (${job.status.progressCurrent})`;
    }

    if (job.status?.lastEndTime) {
        return `${new Date(job.status.lastEndTime).toLocaleString()}${progressSuffix}`;
    }

    if (job.status?.lastStartTime) {
        return `Started ${new Date(job.status.lastStartTime).toLocaleString()}${progressSuffix}`;
    }

    return 'Never';
};

export const JobsPage: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>(JOBS);
    const [error, setError] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    const fetchJobStatuses = async () => {
        try {
            const response = await fetch('/api/jobs');
            if (!response.ok) throw new Error('Failed to fetch job statuses');
            const statuses: JobStatusResponse[] = await response.json();

            setJobs(prevJobs => {
                const newJobs = prevJobs.map(job => {
                    const status = statuses.find(s => s.jobType === job.type) || null;
                    const isRunning = Boolean(status?.lastStartTime && !status.lastEndTime);
                    return { ...job, status, isRunning };
                });

                if (newJobs.some(job => job.isRunning)) {
                    setIsPolling(true);
                } else if (isPolling) {
                    setIsPolling(false);
                }

                return newJobs;
            });

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job statuses';
            setError(errorMessage);
        }
    };

    useEffect(() => {
        fetchJobStatuses();
    }, []);

    useEffect(() => {
        if (!isPolling) return;

        const interval = setInterval(fetchJobStatuses, 2000);
        return () => clearInterval(interval);
    }, [isPolling]);

    const startJob = async (jobType: JobType) => {
        try {
            setError(null);
            setIsPolling(true);
            const response = await fetch(`/api/jobs/${jobType}/start`, { method: 'POST' });
            if (!response.ok) throw new Error('Failed to start job');
            await fetchJobStatuses();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to start job';
            setError(errorMessage);
            setIsPolling(false);
        }
    };

    const startAllJobs = async () => {
        try {
            setError(null);
            setIsPolling(true);
            const response = await fetch('/api/jobs/start-all', { method: 'POST' });
            if (!response.ok) throw new Error('Failed to start all jobs');
            await fetchJobStatuses();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to start all jobs';
            setError(errorMessage);
            setIsPolling(false);
        }
    };

    const getStatusIcon = (job: Job) => {
        if (job.isRunning) return <CircularProgress size={20} />;
        if (!job.status?.lastEndTime) return <Schedule color="disabled" />;
        return job.status.lastSuccess ?
            <CheckCircle color="success" /> :
            <ErrorIcon color="error" />;
    };

    return (
        <PageContainer>
            <PageTitle>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    flexWrap: 'wrap',
                    gap: 2
                }}>
                    <Typography variant="h4" component="h1">
                        Tasks
                    </Typography>
                    <StartAllButton
                        variant="contained"
                        color="primary"
                        onClick={startAllJobs}
                        disabled={jobs.some(job => job.isRunning)}
                        startIcon={<PlayArrow />}
                    >
                        Start All Tasks
                    </StartAllButton>
                </Box>
            </PageTitle>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <JobList>
                {jobs.map(job => (
                    <JobCard key={job.type} elevation={1}>
                        <JobInfo>
                            <Typography variant="h6">{job.name}</Typography>
                            <JobStatus>
                                {getStatusIcon(job)}
                                <Typography variant="body2" color="textSecondary">
                                    Last run: {formatRunDate(job)}
                                </Typography>
                                {job.status?.lastError && (
                                    <Typography variant="body2" color="error">
                                        Error: {job.status.lastError}
                                    </Typography>
                                )}
                            </JobStatus>
                        </JobInfo>
                        <StartJobButton
                            variant="contained"
                            color="primary"
                            onClick={() => startJob(job.type)}
                            disabled={job.isRunning}
                            startIcon={<PlayArrow />}
                        >
                            Start Task
                        </StartJobButton>
                    </JobCard>
                ))}
            </JobList>
        </PageContainer>
    );
};