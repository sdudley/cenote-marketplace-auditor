import { DataSource, Repository } from 'typeorm';
import { Addon } from '../entities/Addon';
import { MarketplaceService } from './MarketplaceService';
import { Pricing } from '../entities/Pricing';
import { PricingInfo } from '../entities/PricingInfo';

export interface UserTierPricing {
    userTier: number;
    cost: number;
}

export type DeploymentType = 'server' | 'datacenter' | 'cloud';

export class PricingService {
    private addonRepository: Repository<Addon>;
    private pricingRepository: Repository<Pricing>;
    private pricingInfoRepository: Repository<PricingInfo>;

    constructor(
        private dataSource: DataSource,
        private marketplaceService: MarketplaceService
    ) {
        this.addonRepository = this.dataSource.getRepository(Addon);
        this.pricingRepository = this.dataSource.getRepository(Pricing);
        this.pricingInfoRepository = this.dataSource.getRepository(PricingInfo);
    }

    async getPricing(addonKey: string, deploymentType: DeploymentType): Promise<UserTierPricing[]> {
        const pricing = await this.pricingRepository.findOne({
            where: {
                addonKey,
                deploymentType
            },
            relations: ['items']
        });

        if (!pricing) {
            throw new Error(`No ${deploymentType} pricing found for addon ${addonKey}`);
        }

        const pricingInfo = await this.pricingInfoRepository.find({
            where: { pricing }
        });

        return pricingInfo
            .filter(item => item.data.monthsValid === 12)
            .map(item => ({
                userTier: item.data.unitCount,
                cost: item.data.amount
            }))
            .sort((a, b) => a.userTier - b.userTier);
    }

    async fetchPricing(): Promise<void> {
        const addons = await this.addonRepository.find();
        console.log(`Found ${addons.length} addons to check pricing for`);

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
                        // Delete existing pricing info
                        await this.pricingInfoRepository.delete({ pricing: existingPricing });
                        // Delete existing pricing
                        await this.pricingRepository.delete(existingPricing.id);
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
                        const pricingInfo = new PricingInfo();
                        pricingInfo.data = item;
                        pricingInfo.pricing = pricing;
                        await this.pricingInfoRepository.save(pricingInfo);
                    }
                } catch (error) {
                    console.log(`No ${deploymentType} pricing available`);
                }
            }
        }
    }
}