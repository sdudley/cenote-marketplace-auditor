import { injectable, inject } from 'inversify';
import { DataSource } from 'typeorm';
import { Addon } from '@common/entities/Addon';
import { TYPES } from '../config/types';

@injectable()
export class AddonService {
    private readonly addonRepository;

    constructor(
        @inject(TYPES.DataSource) private dataSource: DataSource
    ) {
        this.addonRepository = this.dataSource.getRepository(Addon);
    }

    async addAddon(addonKey: string): Promise<void> {
        const addon = new Addon();
        addon.addonKey = addonKey;
        await this.addonRepository.save(addon);
    }

    public async getAddonKeys(): Promise<string[]> {
        const addons = await this.addonRepository.find();
        return addons.map(addon => addon.addonKey);
    }
}