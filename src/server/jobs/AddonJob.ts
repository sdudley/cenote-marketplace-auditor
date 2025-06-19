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

        // Get existing addons from database
        const existingAddons = await this.addonService.getAddons();

        // Upgrade task: try to update existing addons that don't have any parentProducts

        for (const addon of existingAddons) {
            const { parentProduct } = addon;

            if (!parentProduct || parentProduct==='unknown') {
                const parentProduct = await this.marketplaceService.getParentProductForAddon(addon.addonKey);

                if (parentProduct) {
                    console.log(`  Updating parent product for addon ${addon.addonKey} to ${parentProduct}`);
                    addon.parentProduct = parentProduct;
                    await this.addonService.updateAddon(addon);
                }
            }
        }

        const newAddonKeys = marketplaceAddonKeys.filter(key => !existingAddons.some(addon => addon.addonKey === key));

        if (newAddonKeys.length > 0) {
            console.log(`Adding ${newAddonKeys.length} new addons to database...`);

            for (const addonKey of newAddonKeys) {
                console.log(`  Adding addon: ${addonKey}`);
                const parentProduct = await this.marketplaceService.getParentProductForAddon(addonKey);
                await this.addonService.addAddon({ addonKey, parentProduct: parentProduct || 'unknown' });
            }

            console.log('Successfully added new addons to database');
        } else {
            console.log('No new addons to add to database');
        }
    }
}