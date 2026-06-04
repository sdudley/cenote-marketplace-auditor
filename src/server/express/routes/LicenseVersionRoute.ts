import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types.js';
import { LicenseVersionDao } from '../../database/dao/LicenseVersionDao.js';
import { LicenseDao } from '../../database/dao/LicenseDao.js';
import { ConfigDao } from '../../database/dao/ConfigDao.js';
import { MarketplaceService } from '../../services/MarketplaceService.js';
import { pseudonymizeLicenseData } from '#common/pseudonymize/pseudonymizeLicense.js';
import { ConfigKey } from '#common/types/configItem.js';
import { buildLicenseVersionsFromHistory } from '#common/util/licenseVersionUtils.js';
import { isUUID } from '#common/util/validator.js';

@injectable()
export class LicenseVersionRoute {
    public readonly router: Router;

    constructor(
        @inject(TYPES.LicenseVersionDao) private licenseVersionDao: LicenseVersionDao,
        @inject(TYPES.LicenseDao) private licenseDao: LicenseDao,
        @inject(TYPES.ConfigDao) private configDao: ConfigDao,
        @inject(TYPES.MarketplaceService) private marketplaceService: MarketplaceService
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get('/:licenseId/versions/atlassian', this.getAtlassianLicenseVersions.bind(this));
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

    private async getAtlassianLicenseVersions(req: Request, res: Response): Promise<void> {
        try {
            const { licenseId } = req.params;

            if (!licenseId) {
                res.status(400).json({ error: 'License ID is required' });
                return;
            }

            if (!isUUID(licenseId)) {
                res.status(400).json({ error: 'Invalid license ID: must be a valid UUID' });
                return;
            }

            const license = await this.licenseDao.getLicenseById(licenseId);
            if (!license) {
                res.status(404).json({ error: 'License not found' });
                return;
            }

            const snapshots = await this.marketplaceService.getLicenseHistory(license.entitlementId);
            let versions = buildLicenseVersionsFromHistory(snapshots, license.entitlementId);

            const demoMode = await this.configDao.get<boolean>(ConfigKey.DemoMode);
            if (demoMode === true) {
                versions = versions.map(version => ({
                    ...version,
                    data: pseudonymizeLicenseData(version.data)
                }));
            }

            res.json(versions);
        } catch (error) {
            console.error('Error fetching Atlassian license versions:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
