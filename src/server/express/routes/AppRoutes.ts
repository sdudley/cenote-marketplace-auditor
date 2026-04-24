import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types';
import { AddonDao } from '../../database/dao/AddonDao';
import { AppInfo, AppUpdateRequest } from '#common/types/apiTypes';
import { requireAdmin } from '../middleware/adminMiddleware';

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
        this.router.put('/:addonKey', requireAdmin(), this.updateApp.bind(this));
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
                name: addon.name || 'Unknown',
                parentProduct: addon.parentProduct,
                forgeMigrationDate: addon.forgeMigrationDate ?? null,
                forgeReleaseDate: addon.forgeReleaseDate ?? null,
                alwaysForge: addon.alwaysForge ?? false
            }));

            res.json(apps);
        } catch (error) {
            console.error('Error fetching apps:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private isDateOnlyString(value: string): boolean {
        return /^\d{4}-\d{2}-\d{2}$/.test(value);
    }

    private async updateApp(req: Request, res: Response) {
        try {
            const { addonKey } = req.params;
            const existingAddon = await this.addonDao.getAddon(addonKey);

            if (!existingAddon) {
                res.status(404).json({ error: 'App not found' });
                return;
            }

            const {
                forgeMigrationDate,
                forgeReleaseDate,
                alwaysForge
            } = req.body as AppUpdateRequest;

            if (typeof alwaysForge !== 'boolean') {
                res.status(400).json({ error: 'alwaysForge must be a boolean' });
                return;
            }

            const normalizedMigrationDate = forgeMigrationDate || null;
            const normalizedReleaseDate = forgeReleaseDate || null;

            if (normalizedMigrationDate && !this.isDateOnlyString(normalizedMigrationDate)) {
                res.status(400).json({ error: 'forgeMigrationDate must be YYYY-MM-DD' });
                return;
            }

            if (normalizedReleaseDate && !this.isDateOnlyString(normalizedReleaseDate)) {
                res.status(400).json({ error: 'forgeReleaseDate must be YYYY-MM-DD' });
                return;
            }

            if (alwaysForge && normalizedMigrationDate) {
                res.status(400).json({ error: 'alwaysForge apps cannot have forgeMigrationDate' });
                return;
            }

            if (!alwaysForge && normalizedReleaseDate) {
                res.status(400).json({ error: 'forgeReleaseDate can only be set when alwaysForge is true' });
                return;
            }

            existingAddon.alwaysForge = alwaysForge;
            existingAddon.forgeMigrationDate = alwaysForge ? null : normalizedMigrationDate;
            existingAddon.forgeReleaseDate = alwaysForge ? normalizedReleaseDate : null;

            await this.addonDao.updateAddon(existingAddon);

            const app: AppInfo = {
                addonKey: existingAddon.addonKey,
                name: existingAddon.name || 'Unknown',
                parentProduct: existingAddon.parentProduct,
                forgeMigrationDate: existingAddon.forgeMigrationDate ?? null,
                forgeReleaseDate: existingAddon.forgeReleaseDate ?? null,
                alwaysForge: existingAddon.alwaysForge
            };

            res.json(app);
        } catch (error) {
            console.error('Error updating app:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}