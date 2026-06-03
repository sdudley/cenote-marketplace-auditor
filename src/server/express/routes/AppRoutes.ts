import { Router, Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types';
import { AddonDao } from '../../database/dao/AddonDao';
import { PricingDao } from '../../database/dao/PricingDao';
import {
    AppInfo,
    AppPricingPeriodDetail,
    AppPricingPeriodSummary,
    AppPricingSaveRequest,
    AppUpdateRequest
} from '#common/types/apiTypes';
import { requireAdmin } from '../middleware/adminMiddleware';
import { DeploymentType } from '#common/types/marketplace';
import { Pricing } from '#common/entities/Pricing';
import { PricingService } from '#server/services/PricingService';
import { isDateOnlyString, validatePricingPeriods } from '#common/util/pricingPeriodValidation';
import { userTierSorter } from '#common/util/userTierSorter';

const DEPLOYMENT_TYPES: DeploymentType[] = ['cloud', 'server', 'datacenter'];

function normalizeDate(value: string | Date | null | undefined): string | null {
    if (value == null) {
        return null;
    }

    if (value instanceof Date) {
        return value.toISOString().split('T')[0];
    }

    return String(value).substring(0, 10);
}

function toPricingPeriodSummary(pricing: Pricing): AppPricingPeriodSummary {
    return {
        id: pricing.id,
        startDate: normalizeDate(pricing.startDate),
        endDate: normalizeDate(pricing.endDate),
        expertDiscountOptOut: pricing.expertDiscountOptOut
    };
}

function toPricingPeriodDetail(pricing: Pricing): AppPricingPeriodDetail {
    const items = (pricing.items ?? [])
        .map(item => ({
            id: item.id,
            userTier: item.userTier,
            cost: item.cost
        }))
        .sort(userTierSorter);

    return {
        ...toPricingPeriodSummary(pricing),
        addonKey: pricing.addonKey,
        deploymentType: pricing.deploymentType,
        items
    };
}

@injectable()
export class AppRoute {
    public router: Router;

    constructor(
        @inject(TYPES.AddonDao) private addonDao: AddonDao,
        @inject(TYPES.PricingDao) private pricingDao: PricingDao,
        @inject(TYPES.PricingService) private pricingService: PricingService
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/', this.getApps.bind(this));
        this.router.get('/:addonKey/pricing', this.getAppPricing.bind(this));
        this.router.get('/:addonKey/pricing/:pricingId', this.getAppPricingPeriod.bind(this));
        this.router.post('/:addonKey/pricing', requireAdmin(), this.createAppPricingPeriod.bind(this));
        this.router.put('/:addonKey/pricing/:pricingId', requireAdmin(), this.updateAppPricingPeriod.bind(this));
        this.router.delete('/:addonKey/pricing/:pricingId', requireAdmin(), this.deleteAppPricingPeriod.bind(this));
        this.router.put('/:addonKey', requireAdmin(), this.updateApp.bind(this));
    }

    private isValidDeploymentType(value: string): value is DeploymentType {
        return DEPLOYMENT_TYPES.includes(value as DeploymentType);
    }

    private parseOptionalDate(value: unknown, fieldName: string): string | null | undefined {
        if (value === undefined) {
            return undefined;
        }

        if (value === null || value === '') {
            return null;
        }

        if (typeof value !== 'string' || !isDateOnlyString(value)) {
            throw new Error(`${fieldName} must be YYYY-MM-DD or null`);
        }

        return value;
    }

    private async ensureAddonExists(addonKey: string, res: Response): Promise<boolean> {
        const existingAddon = await this.addonDao.getAddon(addonKey);

        if (!existingAddon) {
            res.status(404).json({ error: 'App not found' });
            return false;
        }

        return true;
    }

    private async getApps(req: Request, res: Response) {
        try {
            const addons = await this.addonDao.getAddons();

            const sortedAddons = addons.sort((a, b) => {
                const nameA = a.name || '';
                const nameB = b.name || '';
                return nameA.localeCompare(nameB);
            });

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

    private async getAppPricing(req: Request, res: Response) {
        try {
            const { addonKey } = req.params;
            const deploymentType = req.query.deploymentType;

            if (typeof deploymentType !== 'string' || !this.isValidDeploymentType(deploymentType)) {
                res.status(400).json({ error: 'deploymentType query parameter must be cloud, server, or datacenter' });
                return;
            }

            if (!(await this.ensureAddonExists(addonKey, res))) {
                return;
            }

            const periods = await this.pricingDao.findPeriodsByAddonAndDeployment(addonKey, deploymentType);
            res.json(periods.map(toPricingPeriodSummary));
        } catch (error) {
            console.error('Error fetching app pricing:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async getAppPricingPeriod(req: Request, res: Response) {
        try {
            const { addonKey, pricingId } = req.params;

            if (!(await this.ensureAddonExists(addonKey, res))) {
                return;
            }

            const period = await this.pricingDao.findPeriodWithItems(pricingId);

            if (!period || period.addonKey !== addonKey) {
                res.status(404).json({ error: 'Pricing period not found' });
                return;
            }

            res.json(toPricingPeriodDetail(period));
        } catch (error) {
            console.error('Error fetching app pricing period:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private validateSaveRequest(body: AppPricingSaveRequest): string | null {
        if (!this.isValidDeploymentType(body.deploymentType)) {
            return 'deploymentType must be cloud, server, or datacenter';
        }

        if (!Array.isArray(body.items) || body.items.length === 0) {
            return 'At least one pricing tier is required';
        }

        for (const item of body.items) {
            if (typeof item.userTier !== 'number' || !Number.isFinite(item.userTier)) {
                return 'Each pricing tier must have a numeric userTier';
            }

            if (typeof item.cost !== 'number' || !Number.isFinite(item.cost) || item.cost < 0) {
                return 'Each pricing tier must have a non-negative numeric cost';
            }
        }

        return null;
    }

    private async validatePeriodDates(opts: {
        addonKey: string;
        deploymentType: DeploymentType;
        startDate: string | null;
        endDate: string | null;
        pricingId?: string;
    }): Promise<string | null> {
        const periods = await this.pricingDao.findPeriodsByAddonAndDeployment(opts.addonKey, opts.deploymentType);
        const periodDates = periods.map(period => ({
            id: period.id,
            startDate: normalizeDate(period.startDate),
            endDate: normalizeDate(period.endDate)
        }));

        return validatePricingPeriods(periodDates, {
            id: opts.pricingId,
            startDate: opts.startDate,
            endDate: opts.endDate
        });
    }

    private async createAppPricingPeriod(req: Request, res: Response) {
        try {
            const { addonKey } = req.params;
            const body = req.body as AppPricingSaveRequest;

            const validationError = this.validateSaveRequest(body);
            if (validationError) {
                res.status(400).json({ error: validationError });
                return;
            }

            if (!(await this.ensureAddonExists(addonKey, res))) {
                return;
            }

            let startDate: string | null;
            let endDate: string | null;

            try {
                startDate = this.parseOptionalDate(body.startDate, 'startDate') ?? null;
                endDate = this.parseOptionalDate(body.endDate, 'endDate') ?? null;
            } catch (error) {
                res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid date' });
                return;
            }

            const deploymentType = body.deploymentType as DeploymentType;

            const overlapError = await this.validatePeriodDates({
                addonKey,
                deploymentType,
                startDate,
                endDate
            });

            if (overlapError) {
                res.status(400).json({ error: overlapError });
                return;
            }

            const saved = await this.pricingDao.createPeriod({
                addonKey,
                deploymentType,
                startDate,
                endDate,
                expertDiscountOptOut: body.expertDiscountOptOut,
                items: body.items
            });

            this.pricingService.clearPricingTierCache();
            res.status(201).json(toPricingPeriodDetail(saved));
        } catch (error) {
            console.error('Error creating app pricing period:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async updateAppPricingPeriod(req: Request, res: Response) {
        try {
            const { addonKey, pricingId } = req.params;
            const body = req.body as AppPricingSaveRequest;

            const validationError = this.validateSaveRequest(body);
            if (validationError) {
                res.status(400).json({ error: validationError });
                return;
            }

            if (!(await this.ensureAddonExists(addonKey, res))) {
                return;
            }

            const existing = await this.pricingDao.findPeriodWithItems(pricingId);
            if (!existing || existing.addonKey !== addonKey) {
                res.status(404).json({ error: 'Pricing period not found' });
                return;
            }

            let startDate: string | null;
            let endDate: string | null;

            try {
                startDate = this.parseOptionalDate(body.startDate, 'startDate') ?? null;
                endDate = this.parseOptionalDate(body.endDate, 'endDate') ?? null;
            } catch (error) {
                res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid date' });
                return;
            }

            const deploymentType = body.deploymentType as DeploymentType;

            const overlapError = await this.validatePeriodDates({
                addonKey,
                deploymentType,
                startDate,
                endDate,
                pricingId
            });

            if (overlapError) {
                res.status(400).json({ error: overlapError });
                return;
            }

            const saved = await this.pricingDao.updatePeriod(pricingId, {
                addonKey,
                deploymentType,
                startDate,
                endDate,
                expertDiscountOptOut: body.expertDiscountOptOut,
                items: body.items
            });

            this.pricingService.clearPricingTierCache();
            res.json(toPricingPeriodDetail(saved));
        } catch (error) {
            console.error('Error updating app pricing period:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async deleteAppPricingPeriod(req: Request, res: Response) {
        try {
            const { addonKey, pricingId } = req.params;

            if (!(await this.ensureAddonExists(addonKey, res))) {
                return;
            }

            const existing = await this.pricingDao.findPeriodWithItems(pricingId);
            if (!existing || existing.addonKey !== addonKey) {
                res.status(404).json({ error: 'Pricing period not found' });
                return;
            }

            await this.pricingDao.deletePeriod(pricingId);
            this.pricingService.clearPricingTierCache();
            res.status(204).end();
        } catch (error) {
            console.error('Error deleting app pricing period:', error);
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
