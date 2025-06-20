import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types';
import { AddonDao } from '../../database/dao/AddonDao';

export interface AppInfo {
    addonKey: string;
    name: string;
}

@injectable()
export class AppRoute {
    public router: Router;

    constructor(
        @inject(TYPES.AddonDao) private addonDao: AddonDao
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/', this.getApps.bind(this));
    }

    private async getApps(req: Request, res: Response) {
        try {
            const addons = await this.addonDao.getAddons();

            // Sort addons alphabetically by name, with null/undefined names at the end
            const sortedAddons = addons.sort((a, b) => {
                const nameA = a.name || '';
                const nameB = b.name || '';
                return nameA.localeCompare(nameB);
            });

            // Map to the response format
            const apps: AppInfo[] = sortedAddons.map(addon => ({
                addonKey: addon.addonKey,
                name: addon.name || 'Unknown'
            }));

            res.json(apps);
        } catch (error) {
            console.error('Error fetching apps:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}