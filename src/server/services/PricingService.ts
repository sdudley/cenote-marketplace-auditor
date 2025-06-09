import { DataSource, Repository, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Pricing } from '#common/entities/Pricing';
import { PricingInfo } from '#common/entities/PricingInfo';
import { isoDateMath } from '#common/utils/dateUtils';
import { inject, injectable } from 'inversify';
import { TYPES } from '../config/types';
import { UserTierPricing } from '#common/types/userTiers';
import { userTierSorter } from '#common/utils/userTierSorter';
import { DeploymentType } from '#common/types/marketplace';
import { PricingTierResult } from '#common/types/pricingTierResult';

@injectable()
export class PricingService {
    private pricingRepository: Repository<Pricing>;
    private pricingInfoRepository: Repository<PricingInfo>;

    private pricingTierCache: Map<string, PricingTierResult> = new Map();

    constructor(
        @inject(TYPES.DataSource) private dataSource: DataSource
    ) {
        this.pricingRepository = this.dataSource.getRepository(Pricing);
        this.pricingInfoRepository = this.dataSource.getRepository(PricingInfo);
    }

    /**
     * Get the pricing tiers for a given addon, deployment type, and sale date.
     *
     * @param opts
     * @returns
     */
    public async getPricingTiers(opts: { addonKey: string, deploymentType: DeploymentType, saleDate: string }): Promise<PricingTierResult> {
        const { addonKey, deploymentType, saleDate } = opts;

        const cacheKey = `${addonKey}-${deploymentType}-${saleDate}`;

        if (this.pricingTierCache.has(cacheKey)) {
            return this.pricingTierCache.get(cacheKey) as PricingTierResult;
        }

        // Fetch the pricing record corresponding to the period of the sale date

        const pricing = await this.getPricing(opts);

        if (!pricing) {
            throw new Error(`No ${deploymentType} pricing found for addon ${addonKey} on date ${saleDate}`);
        }

        const tiers = this.pricingToUserTiers(pricing);
        let priorTiers: UserTierPricing[]|undefined = undefined;

        // Now check to see if there is a prior period pricing that we need to include.

        let priorPricingEndDate: string|undefined = undefined;
        if (pricing.startDate) {
            const priorPeriodEndDate = isoDateMath(pricing.startDate, -1);

            const priorPricing = await this.pricingRepository.findOne({
                where: {
                    addonKey,
                    deploymentType,
                    endDate: priorPeriodEndDate
                },
                relations: ['items']
            });

            if (priorPricing) {
                priorTiers = this.pricingToUserTiers(priorPricing);
                priorPricingEndDate = priorPricing.endDate as unknown as string;
            }
        }

        const result : PricingTierResult = {
            tiers,
            priorTiers,
            priorPricingEndDate
        };

        this.pricingTierCache.set(cacheKey, result);

        return result;
    }

    /**
     * Get the top-level pricing record (only metadata, not the tiers) for a given sale date.
     */
    public async getPricing(opts: { addonKey: string, deploymentType: DeploymentType, saleDate: string }) : Promise<Pricing|null> {
        const { addonKey, deploymentType, saleDate } = opts;

        const pricing = await this.pricingRepository.findOne({
            where: [
                // Case 1: startDate is null (beginning of time) and endDate is null (end of time)
                {
                    addonKey,
                    deploymentType,
                    startDate: IsNull(),
                    endDate: IsNull()
                },
                // Case 2: startDate is null (beginning of time) and saleDate is before or equal to endDate
                {
                    addonKey,
                    deploymentType,
                    startDate: IsNull(),
                    endDate: MoreThanOrEqual(saleDate)
                },
                // Case 3: endDate is null (end of time) and saleDate is after or equal to startDate
                {
                    addonKey,
                    deploymentType,
                    startDate: LessThanOrEqual(saleDate),
                    endDate: IsNull()
                },
                // Case 4: saleDate falls between startDate and endDate
                {
                    addonKey,
                    deploymentType,
                    startDate: LessThanOrEqual(saleDate),
                    endDate: MoreThanOrEqual(saleDate)
                }
            ],
            relations: ['items']
        });

        return pricing;
    }

    private pricingToUserTiers(pricing: Pricing): UserTierPricing[] {
        return pricing.items
            .map(({ userTier, cost }) => ({
                userTier,
                cost
            } as UserTierPricing))
            .sort(userTierSorter);
    }

    public async savePricing(opts: { addonKey: string, deploymentType: DeploymentType, startDate: string|undefined, endDate: string|undefined, expertDiscountOptOut: boolean }) : Promise<Pricing> {
        const { addonKey, deploymentType, startDate, endDate, expertDiscountOptOut } = opts;

        const pricing = new Pricing();
        pricing.addonKey = addonKey;
        pricing.deploymentType = deploymentType;
        pricing.startDate = startDate;
        pricing.endDate = endDate;
        pricing.expertDiscountOptOut = expertDiscountOptOut;
        return await this.pricingRepository.save(pricing);
    }

    public async savePricingInfo(item: { unitCount: number; amount: number; }, pricing: Pricing) : Promise<void> {
        const pricingInfo = new PricingInfo();
        pricingInfo.userTier = item.unitCount;
        pricingInfo.cost = item.amount;
        pricingInfo.pricing = pricing;
        await this.pricingInfoRepository.save(pricingInfo);
    }

    public async findPricing(opts: { addonKey: string, deploymentType: DeploymentType, startDate: string|undefined, endDate: string|undefined }) : Promise<Pricing|null> {
        const { addonKey, deploymentType, startDate, endDate } = opts;

        return await this.pricingRepository.findOne({
            where: {
                addonKey: addonKey,
                deploymentType,
                startDate,
                endDate
            }
        });
    }
}