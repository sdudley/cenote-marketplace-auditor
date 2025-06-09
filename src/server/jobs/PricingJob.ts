import { MarketplaceService } from '../services/MarketplaceService';
import { inject, injectable } from 'inversify';
import { TYPES } from '../config/types';
import { DeploymentType } from '#common/types/marketplace';
import { PricingService } from '../services/PricingService';
import { AddonService } from '../services/AddonService';

@injectable()
export class PricingJob {
    constructor(
        @inject(TYPES.MarketplaceService) private marketplaceService: MarketplaceService,
        @inject(TYPES.PricingService) private pricingService: PricingService,
        @inject(TYPES.AddonService) private addonService: AddonService
    ) {

    }

    public async fetchPricing(): Promise<void> {
        console.log(`\n=== Fetching pricing for apps ===`);

        const addons = await this.addonService.getAddonKeys();
        console.log(`Found ${addons.length} addons to check pricing`);

        for (const addonKey of addons) {
            console.log(`\n=== Pricing for ${addonKey} ===`);

            // Try to fetch pricing for each deployment type
            const deploymentTypes: DeploymentType[] = ['cloud', 'server', 'datacenter'];
            for (const deploymentType of deploymentTypes) {
                try {
                    console.log(`\nFetching ${deploymentType.toUpperCase()} pricing:`);
                    const pricingData = await this.marketplaceService.getPricing(
                        addonKey,
                        deploymentType,
                        'live'
                    );

                    const startDate = undefined;
                    const endDate = undefined;

                    // Check for existing pricing
                    const existingPricing = await this.pricingService.findPricing({
                        addonKey: addonKey,
                        deploymentType,
                        startDate,
                        endDate
                    });

                    if (existingPricing) {
                        continue;

                        // Or else delete existing pricing info
                        // await this.pricingInfoRepository.delete({ pricing: existingPricing });
                        // await this.pricingRepository.delete(existingPricing.id);
                    }

                    const { expertDiscountOptOut } = pricingData;

                    // Store the pricing data
                    const pricing = await this.pricingService.savePricing({
                        addonKey,
                        deploymentType,
                        startDate: undefined,
                        endDate: undefined,
                        expertDiscountOptOut
                    });

                    // console.log(`\n=== Pricing for ${addon.addonKey} with deployment type ${deploymentType} ===`);
                    // console.dir(pricingData, { depth: null });

                    // Now pull down the appropriate pricing type based on the deployment

                    let items : { amount: number; unitCount: number; }[] = [];

                    if (deploymentType==='cloud') {
                        if (!pricingData.perUnitItems) {
                            throw new Error(`No perUnitItems found for ${addonKey} with deployment type ${deploymentType}`);
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
                        throw new Error(`No pricing items found for ${addonKey} with deployment type ${deploymentType}`);
                    }

                    // Store each pricing item
                    for (const item of items) {
                        await this.pricingService.savePricingInfo(item, pricing);
                    }
                } catch (e) {
                    console.warn(`App ${addonKey} has no pricing available for deploymentType=${deploymentType}`, e);
                }
            }
        }

        console.log('Pricing fetched');
    }
}