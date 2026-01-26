import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types';
import { LicenseVersionDao } from '../../database/dao/LicenseVersionDao';
import { ConfigDao } from '../../database/dao/ConfigDao';
import { pseudonymizeLicenseData } from '#common/pseudonymize/pseudonymizeLicense';
import { ConfigKey } from '#common/types/configItem';

@injectable()
export class LicenseVersionRoute {
    public readonly router: Router;

    constructor(
        @inject(TYPES.LicenseVersionDao) private licenseVersionDao: LicenseVersionDao,
        @inject(TYPES.ConfigDao) private configDao: ConfigDao
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

            let versions = await this.licenseVersionDao.getLicenseVersions(licenseId);

            const demoMode = await this.configDao.get<boolean>(ConfigKey.DemoMode);
            if (demoMode === true) {
                versions = versions.map(tv => ({...tv, data: pseudonymizeLicenseData(tv.data)}));
            }

            res.json(versions);
        } catch (error) {
            console.error('Error fetching license versions:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}