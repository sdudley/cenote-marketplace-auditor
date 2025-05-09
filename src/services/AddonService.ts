import { DataSource } from 'typeorm';
import { Addon } from '../entities/Addon';
import { MarketplaceService } from './MarketplaceService';

export class AddonService {
    private readonly addonRepository;

    constructor(
        private dataSource: DataSource,
        private marketplaceService: MarketplaceService
    ) {
        this.addonRepository = this.dataSource.getRepository(Addon);
    }

    async addAddon(addonKey: string): Promise<void> {
        const addon = new Addon();
        addon.addonKey = addonKey;
        await this.addonRepository.save(addon);
    }

    async syncAddonKeys(): Promise<void> {
        console.log('\nFetching addon keys from Marketplace API...');
        const marketplaceAddonKeys = await this.marketplaceService.getVendorSpecificAddonKeys();
        console.log(`Found ${marketplaceAddonKeys.length} addons in Marketplace`);

        // Get existing addon keys from database
        const existingAddonKeys = new Set(await this.getAddonKeys());

        // Find new addon keys that don't exist in our database
        const newAddonKeys = marketplaceAddonKeys.filter(key => !existingAddonKeys.has(key));

        if (newAddonKeys.length > 0) {
            console.log(`Adding ${newAddonKeys.length} new addons to database...`);
            const newAddons = newAddonKeys.map(key => {
                const addon = new Addon();
                addon.addonKey = key;
                console.log(`  Adding addon: ${addon.addonKey}`);
                return addon;
            });

            await this.addonRepository.save(newAddons);
            console.log('Successfully added new addons to database');
        } else {
            console.log('No new addons to add to database');
        }
    }

    async getAddonKeys(): Promise<string[]> {
        const addons = await this.addonRepository.find();
        return addons.map(addon => addon.addonKey);
    }
}