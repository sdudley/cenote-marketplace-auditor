import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types';
import { LicenseDao } from '../../database/dao/LicenseDao';
import { LicenseQueryParams, LicenseQuerySortType, LicenseQueryResult } from '#common/types/apiTypes';
import { pseudonymizeLicense } from '#common/pseudonymize/pseudonymizeLicense';

@injectable()
export class LicenseRoute {
    public router: Router;

    constructor(
        @inject(TYPES.LicenseDao) private licenseDao: LicenseDao
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/', this.getLicenses.bind(this));
    }

    private async getLicenses(req: Request, res: Response) {
        try {
            const params: LicenseQueryParams = {
                start: parseInt(req.query.start as string) || 0,
                limit: parseInt(req.query.limit as string) || 25,
                sortBy: (req.query.sortBy as LicenseQuerySortType) || LicenseQuerySortType.CreatedAt,
                sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC',
                search: req.query.search as string,
                hosting: req.query.hosting as string,
                status: req.query.status as string,
                addonKey: req.query.addonKey as string,
                licenseType: Array.isArray(req.query.licenseType) ? req.query.licenseType as string[] : req.query.licenseType ? [req.query.licenseType as string] : undefined
            };

            // Validate parameters
            if (params.start! < 0) {
                return res.status(400).json({ error: 'start must be non-negative' });
            }
            if (params.limit! < 1 || params.limit! > 100) {
                return res.status(400).json({ error: 'limit must be between 1 and 100' });
            }

            // Validate sortBy using LicenseQuerySortType enum
            if (!Object.values(LicenseQuerySortType).includes(params.sortBy as LicenseQuerySortType)) {
                return res.status(400).json({
                    error: `sortBy must be one of: ${Object.values(LicenseQuerySortType).join(', ')}`
                });
            }

            if (params.sortOrder !== 'ASC' && params.sortOrder !== 'DESC') {
                return res.status(400).json({ error: 'sortOrder must be either ASC or DESC' });
            }

            const result: LicenseQueryResult = await this.licenseDao.getLicenses(params);

            if (process.env.RANDOMIZE_LICENSES === 'true') {
                result.licenses = result.licenses.map(l => ({...l, license: pseudonymizeLicense(l.license)}));
            }

            res.json(result);
        } catch (error) {
            console.error('Error fetching licenses:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}