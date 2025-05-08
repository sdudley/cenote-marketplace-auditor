import { DataSource, Repository, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Addon } from '../entities/Addon';
import { MarketplaceService } from './MarketplaceService';
import { Pricing } from '../entities/Pricing';
import { PricingInfo } from '../entities/PricingInfo';
import { createUTCDateFromString } from '../utils/dateUtils';

export interface UserTierPricing {
    userTier: number;
    cost: number;
}

export type DeploymentType = 'server' | 'datacenter' | 'cloud';

export class PricingService {
    private addonRepository: Repository<Addon>;
    private pricingRepository: Repository<Pricing>;
    private pricingInfoRepository: Repository<PricingInfo>;

    private pricingCache: Map<string, UserTierPricing[]> = new Map();

    constructor(
        private dataSource: DataSource,
        private marketplaceService: MarketplaceService
    ) {
        this.addonRepository = this.dataSource.getRepository(Addon);
        this.pricingRepository = this.dataSource.getRepository(Pricing);
        this.pricingInfoRepository = this.dataSource.getRepository(PricingInfo);
    }

    async getPricing(opts: { addonKey: string, deploymentType: DeploymentType, saleDate: string }): Promise<UserTierPricing[]> {
        const { addonKey, deploymentType, saleDate } = opts;

        const cacheKey = `${addonKey}-${deploymentType}-${saleDate}`;

        if (this.pricingCache.has(cacheKey)) {
            return this.pricingCache.get(cacheKey) as UserTierPricing[];
        }

        const saleDateObj = createUTCDateFromString(saleDate);

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
                    endDate: MoreThanOrEqual(saleDateObj)
                },
                // Case 3: endDate is null (end of time) and saleDate is after or equal to startDate
                {
                    addonKey,
                    deploymentType,
                    startDate: LessThanOrEqual(saleDateObj),
                    endDate: IsNull()
                },
                // Case 4: saleDate falls between startDate and endDate
                {
                    addonKey,
                    deploymentType,
                    startDate: LessThanOrEqual(saleDateObj),
                    endDate: MoreThanOrEqual(saleDateObj)
                }
            ],
            relations: ['items']
        });

        if (!pricing) {
            throw new Error(`No ${deploymentType} pricing found for addon ${addonKey} on date ${saleDate}`);
        }

        const pricingInfo = await this.pricingInfoRepository.find({
            where: { pricing }
        });

        const result = pricingInfo
            .map(({ userTier, cost }) => ({
                userTier,
                cost
            } as UserTierPricing))
            .sort((a, b) => a.userTier - b.userTier);

        this.pricingCache.set(cacheKey, result);

        return result;
    }

    async fetchPricing(): Promise<void> {
        const addons = await this.addonRepository.find();
        console.log(`Found ${addons.length} addons to check pricing`);

        for (const addon of addons) {
            console.log(`\n=== Pricing for ${addon.addonKey} ===`);

            // Try to fetch pricing for each deployment type
            const deploymentTypes : DeploymentType[] = ['server', 'datacenter', 'cloud'] as const;
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

                    // Store each pricing item
                    for (const item of pricingData.items) {
                        if (item.monthsValid !== 12) {
                            continue;
                        }

                        const pricingInfo = new PricingInfo();
                        pricingInfo.userTier = item.unitCount;
                        pricingInfo.cost = item.amount;
                        pricingInfo.pricing = pricing;
                        await this.pricingInfoRepository.save(pricingInfo);
                    }
                } catch (e) {
                    console.log(`No ${deploymentType} pricing available`, e);
                }
            }
        }
    }
}