import { Router } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types';
import { SchedulerService } from '../../services/SchedulerService';
import { ConfigDao } from '../../database/ConfigDao';
import { ConfigKey } from '#common/types/configItem';

@injectable()
export class SchedulerRoute {
    private router: Router;

    constructor(
        @inject(TYPES.SchedulerService) private schedulerService: SchedulerService,
        @inject(TYPES.ConfigDao) private configDao: ConfigDao
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        // Get scheduler status and frequency
        this.router.get('/', async (req, res) => {
            try {
                const frequency = await this.configDao.get<number>(ConfigKey.SchedulerFrequency) ?? 0;

                res.json({ frequency });
            } catch (error) {
                console.error('Error getting scheduler status:', error);
                res.status(500).json({ error: 'Failed to get scheduler status' });
            }
        });

        // Set scheduler frequency
        this.router.post('/', async (req, res) => {
            try {
                const { frequency } = req.body;
                if (typeof frequency !== 'number' || frequency < 0) {
                    return res.status(400).json({ error: 'Frequency must be a non-negative number' });
                }

                await this.configDao.set(ConfigKey.SchedulerFrequency, frequency);
                await this.schedulerService.updateSchedule();

                res.json({ frequency });
            } catch (error) {
                console.error('Error setting scheduler frequency:', error);
                res.status(500).json({ error: 'Failed to set scheduler frequency' });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}