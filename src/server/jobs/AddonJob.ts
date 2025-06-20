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
        const marketplaceAddons = await this.marketplaceService.getVendorSpecificAddons();
        console.log(`Found ${marketplaceAddons.length} addons in Marketplace`);

        // Get existing addons from database
        const existingAddons = await this.addonService.getAddons();

        // Upgrade task: try to update existing addons that don't have any parentProducts, and apply
        // name changes

        for (const addon of existingAddons) {
            const { parentProduct, name } = addon;

            if (!parentProduct || parentProduct==='unknown') {
                const parentProduct = await this.marketplaceService.getParentProductForAddon(addon.addonKey);

                if (parentProduct) {
                    console.log(`  Updating parent product for addon ${addon.addonKey} to ${parentProduct}`);
                    addon.parentProduct = parentProduct;
                    await this.addonService.updateAddon(addon);
                }
            }

            // Using marketplaceAddons, backfill the name
            const marketplaceAddon = marketplaceAddons.find(a => a.key === addon.addonKey);

            if (marketplaceAddon && marketplaceAddon.name !== addon.name) {
                console.log(`  Updating name for addon ${addon.addonKey} to ${marketplaceAddon.name}`);
                addon.name = marketplaceAddon.name;
                await this.addonService.updateAddon(addon);
            }
        }

        const newAddons = marketplaceAddons.filter(mpa => !existingAddons.some(addon => addon.addonKey === mpa.key));

        if (newAddons.length > 0) {
            console.log(`Adding ${newAddons.length} new addons to database...`);

            for (const addon of newAddons) {
                console.log(`  Adding addon: ${addon.key}`);
                const parentProduct = await this.marketplaceService.getParentProductForAddon(addon.key);
                await this.addonService.addAddon({ addonKey: addon.key, name: addon.name, parentProduct: parentProduct || 'unknown' });
            }

            console.log('Successfully added new addons to database');
        } else {
            console.log('No new addons to add to database');
        }
    }
}