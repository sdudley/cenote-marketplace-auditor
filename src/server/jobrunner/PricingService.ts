import { DataSource, Repository, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Addon } from '../../common/entities/Addon';
import { MarketplaceService } from './MarketplaceService';
import { Pricing } from '../../common/entities/Pricing';
import { PricingInfo } from '../../common/entities/PricingInfo';
import { isoDateMath } from '../../common/utils/dateUtils';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../common/config/types';
import { UserTierPricing } from '../../common/types/userTiers';
import { userTierSorter } from '../../common/utils/userTierSorter';
import { DeploymentType } from '../../common/types/marketplace';

export interface PricingTierResult {
    tiers: UserTierPricing[];                   // Pricing tiers corresponding to the saleDate of the transaction
    priorTiers: UserTierPricing[]|undefined;    // Pricing tiers corresponding to the period prior to the saleDate of the transaction
    priorPricingEndDate: string|undefined;      // Date on which the priorTiers pricing was supposed to end
}

@injectable()
export class PricingService {
    private addonRepository: Repository<Addon>;
    private pricingRepository: Repository<Pricing>;
    private pricingInfoRepository: Repository<PricingInfo>;

    private pricingTierCache: Map<string, PricingTierResult> = new Map();

    constructor(
        @inject(TYPES.DataSource) private dataSource: DataSource,
        @inject(TYPES.MarketplaceService) private marketplaceService: MarketplaceService
    ) {
        this.addonRepository = this.dataSource.getRepository(Addon);
        this.pricingRepository = this.dataSource.getRepository(Pricing);
        this.pricingInfoRepository = this.dataSource.getRepository(PricingInfo);
    }

    async getPricingTiers(opts: { addonKey: string, deploymentType: DeploymentType, saleDate: string }): Promise<PricingTierResult> {
        const { addonKey, deploymentType, saleDate } = opts;

        const cacheKey = `${addonKey}-${deploymentType}-${saleDate}`;

        if (this.pricingTierCache.has(cacheKey)) {
            return this.pricingTierCache.get(cacheKey) as PricingTierResult;
        }

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

        const result = {
            tiers,
            priorTiers,
            priorPricingEndDate
        };

        this.pricingTierCache.set(cacheKey, result);

        return result;
    }

    private pricingToUserTiers(pricing: Pricing): UserTierPricing[] {
        return pricing.items
            .map(({ userTier, cost }) => ({
                userTier,
                cost
            } as UserTierPricing))
            .sort(userTierSorter);
    }

    async fetchPricing(): Promise<void> {
        console.log(`\n=== Fetching pricing for apps ===`);

        const addons = await this.addonRepository.find();
        console.log(`Found ${addons.length} addons to check pricing`);

        for (const addon of addons) {
            console.log(`\n=== Pricing for ${addon.addonKey} ===`);

            // Try to fetch pricing for each deployment type
            const deploymentTypes: DeploymentType[] = ['cloud', 'server', 'datacenter'];
            for (const deploymentType of deploymentTypes) {
                try {
                    console.log(`\nFetching ${deploymentType.toUpperCase()} pricing:`);
                    const pricingData = await this.marketplaceService.getPricing(
                        addon.addonKey,
                        deploymentType,
                        'live'
                    );

                    const startDate = undefined;
                    const endDate = undefined;

                    // Check for existing pricing
                    const existingPricing = await this.pricingRepository.findOne({
                        where: {
                            addonKey: addon.addonKey,
                            deploymentType,
                            startDate,
                            endDate
                        }
                    });

                    if (existingPricing) {
                        continue;

                        // Or else delete existing pricing info
                        // await this.pricingInfoRepository.delete({ pricing: existingPricing });
                        // await this.pricingRepository.delete(existingPricing.id);
                    }

                    // Store the pricing data
                    const pricing = new Pricing();
                    pricing.addonKey = addon.addonKey;
                    pricing.deploymentType = deploymentType;
                    pricing.startDate = undefined;
                    pricing.endDate = undefined;
                    await this.pricingRepository.save(pricing);

                    // console.log(`\n=== Pricing for ${addon.addonKey} with deployment type ${deploymentType} ===`);
                    // console.dir(pricingData, { depth: null });

                    // Now pull down the appropriate pricing type based on the deployment

                    let items : { amount: number; unitCount: number; }[] = [];

                    if (deploymentType==='cloud') {
                        if (!pricingData.perUnitItems) {
                            throw new Error(`No perUnitItems found for ${addon.addonKey} with deployment type ${deploymentType}`);
                        }

                        // Get the 10-user price
                        items = items.concat(pricingData.items.filter(i => i.monthsValid===1).map(i => ({ unitCount: i.unitCount, amount: i.amount })));

                        // Get all of the other per-tier prices
                        items = items.concat(pricingData.perUnitItems?.filter(i => i.monthsValid===1).map(i => ({ unitCount: i.unitCount, amount: i.amount })));
                    } else {
                        // DC and server pricing is only 12-month pricing

                        items = items.concat(pricingData.items.filter(i => i.monthsValid===12).map(i => ({ unitCount: i.unitCount, amount: i.amount })));
                    }

                    if (!items) {
                        throw new Error(`No pricing items found for ${addon.addonKey} with deployment type ${deploymentType}`);
                    }

                    // Store each pricing item
                    for (const item of items) {
                        await this.savePricingInfo(item, pricing);
                    }
                } catch (e) {
                    console.warn(`App ${addon.addonKey} has no pricing available for deploymentType=${deploymentType}`, e);
                }
            }
        }

        console.log('Pricing fetched');
    }

    private async savePricingInfo(item: { unitCount: number; amount: number; }, pricing: Pricing) : Promise<void> {
        const pricingInfo = new PricingInfo();
        pricingInfo.userTier = item.unitCount;
        pricingInfo.cost = item.amount;
        pricingInfo.pricing = pricing;
        await this.pricingInfoRepository.save(pricingInfo);
    }
}