import { injectable, inject } from 'inversify';
import { MarketplaceService } from '../services/MarketplaceService';
import { TYPES } from '../config/types';
import { AddonService } from '../services/AddonService';

@injectable()
export class AddonJob {
    constructor(
        @inject(TYPES.MarketplaceService) private marketplaceService: MarketplaceService,
        @inject(TYPES.AddonService) private addonService: AddonService
    ) {
    }

    async syncAddonKeys(): Promise<void> {
        console.log('\nFetching addon keys from Marketplace API...');
        const marketplaceAddonKeys = await this.marketplaceService.getVendorSpecificAddonKeys();
        console.log(`Found ${marketplaceAddonKeys.length} addons in Marketplace`);

        // Get existing addon keys from database
        const existingAddonKeys = new Set(await this.addonService.getAddonKeys());

        // Find new addon keys that don't exist in our database
        const newAddonKeys = marketplaceAddonKeys.filter(key => !existingAddonKeys.has(key));

        if (newAddonKeys.length > 0) {
            console.log(`Adding ${newAddonKeys.length} new addons to database...`);

            for (const addonKey of newAddonKeys) {
                console.log(`  Adding addon: ${addonKey}`);
                await this.addonService.addAddon(addonKey);
            }

            console.log('Successfully added new addons to database');
        } else {
            console.log('No new addons to add to database');
        }
    }
}