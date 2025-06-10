import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types';
import { LicenseVersionDao } from '../../database/LicenseVersionDao';

@injectable()
export class LicenseVersionRoute {
    public readonly router: Router;

    constructor(
        @inject(TYPES.LicenseVersionDao) private licenseVersionDao: LicenseVersionDao
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get('/:licenseId/versions', this.getLicenseVersions.bind(this));
    }

    private async getLicenseVersions(req: Request, res: Response): Promise<void> {
        try {
            const { licenseId } = req.params;

            if (!licenseId) {
                res.status(400).json({ error: 'License ID is required' });
                return;
            }

            const versions = await this.licenseVersionDao.getLicenseVersions(licenseId);
            res.json(versions);
        } catch (error) {
            console.error('Error fetching license versions:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}