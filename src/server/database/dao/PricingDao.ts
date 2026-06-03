import { injectable, inject } from 'inversify';
import { DataSource, Repository } from 'typeorm';
import { Pricing } from '#common/entities/Pricing';
import { PricingInfo } from '#common/entities/PricingInfo';
import { TYPES } from '../../config/types';
import { DeploymentType } from '#common/types/marketplace';

export interface PricingInfoInput {
    id?: string;
    userTier: number;
    cost: number;
}

export interface SavePricingPeriodInput {
    addonKey: string;
    deploymentType: DeploymentType;
    startDate?: string | null;
    endDate?: string | null;
    expertDiscountOptOut?: boolean;
    items: PricingInfoInput[];
}

@injectable()
export class PricingDao {
    private readonly pricingRepository: Repository<Pricing>;
    private readonly pricingInfoRepository: Repository<PricingInfo>;

    constructor(
        @inject(TYPES.DataSource) private dataSource: DataSource
    ) {
        this.pricingRepository = this.dataSource.getRepository(Pricing);
        this.pricingInfoRepository = this.dataSource.getRepository(PricingInfo);
    }

    public async findPeriodsByAddonAndDeployment(
        addonKey: string,
        deploymentType: DeploymentType
    ): Promise<Pricing[]> {
        const periods = await this.pricingRepository.find({
            where: { addonKey, deploymentType },
            relations: ['items']
        });

        return periods.sort((a, b) => {
            const startA = a.startDate ?? '';
            const startB = b.startDate ?? '';
            return startA.localeCompare(startB);
        });
    }

    public async findPeriodWithItems(pricingId: string): Promise<Pricing | null> {
        return await this.pricingRepository.findOne({
            where: { id: pricingId },
            relations: ['items']
        });
    }

    public async createPeriod(input: SavePricingPeriodInput): Promise<Pricing> {
        const pricing = new Pricing();
        pricing.addonKey = input.addonKey;
        pricing.deploymentType = input.deploymentType;
        pricing.startDate = input.startDate ?? null;
        pricing.endDate = input.endDate ?? null;
        pricing.expertDiscountOptOut = input.expertDiscountOptOut ?? false;

        const savedPricing = await this.pricingRepository.save(pricing);
        await this.replacePricingItems(savedPricing, input.items);

        return (await this.findPeriodWithItems(savedPricing.id)) as Pricing;
    }

    public async updatePeriod(pricingId: string, input: SavePricingPeriodInput): Promise<Pricing> {
        const pricing = await this.findPeriodWithItems(pricingId);

        if (!pricing) {
            throw new Error('Pricing period not found');
        }

        pricing.startDate = input.startDate ?? null;
        pricing.endDate = input.endDate ?? null;
        if (typeof input.expertDiscountOptOut === 'boolean') {
            pricing.expertDiscountOptOut = input.expertDiscountOptOut;
        }

        await this.pricingRepository.save(pricing);
        await this.replacePricingItems(pricing, input.items);

        return (await this.findPeriodWithItems(pricingId)) as Pricing;
    }

    public async deletePeriod(pricingId: string): Promise<void> {
        await this.pricingInfoRepository.delete({ pricing: { id: pricingId } });
        await this.pricingRepository.delete(pricingId);
    }

    private async replacePricingItems(pricing: Pricing, items: PricingInfoInput[]): Promise<void> {
        await this.pricingInfoRepository.delete({ pricing: { id: pricing.id } });

        const pricingInfoRecords = items.map(item => {
            const pricingInfo = new PricingInfo();
            pricingInfo.userTier = item.userTier;
            pricingInfo.cost = item.cost;
            pricingInfo.pricing = pricing;
            return pricingInfo;
        });

        if (pricingInfoRecords.length > 0) {
            await this.pricingInfoRepository.save(pricingInfoRecords);
        }
    }
}
