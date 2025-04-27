import { DataSource, Repository } from 'typeorm';
import { Addon } from '../entities/Addon';
import { MarketplaceService } from './MarketplaceService';
import { Pricing } from '../entities/Pricing';
import { PricingInfo } from '../entities/PricingInfo';

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

    async fetchAndDisplayPricing(): Promise<void> {
        const addons = await this.addonRepository.find();
        console.log(`Found ${addons.length} addons to check pricing for`);

        for (const addon of addons) {
            console.log(`\n=== Pricing for ${addon.addonKey} ===`);

            // Try to fetch pricing for each deployment type
            const deploymentTypes = ['server', 'datacenter', 'cloud'] as const;
            for (const deploymentType of deploymentTypes) {
                try {
                    console.log(`\n${deploymentType.toUpperCase()} pricing:`);
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