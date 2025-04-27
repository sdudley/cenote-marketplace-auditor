import { DataSource, Repository } from 'typeorm';
import { Addon } from '../entities/Addon';
import { MarketplaceService } from './MarketplaceService';
import { PricingData } from '../types/marketplace';

export class PricingService {
    private addonRepository: Repository<Addon>;

    constructor(
        private dataSource: DataSource,
        private marketplaceService: MarketplaceService
    ) {
        this.addonRepository = this.dataSource.getRepository(Addon);
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
                    const pricing = await this.marketplaceService.getPricing(
                        addon.addonKey,
                        deploymentType,
                        'live'
                    );
                    console.log(JSON.stringify(pricing, null, 2));
                } catch (error) {
                    console.log(`No ${deploymentType} pricing available`);
                }
            }
        }
    }
}