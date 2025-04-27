import { DataSource } from 'typeorm';
import { Addon } from '../entities/Addon';

export class AddonService {
    constructor(private dataSource: DataSource) {}

    async addAddon(addonKey: string): Promise<void> {
        const addon = new Addon();
        addon.addonKey = addonKey;
        await this.dataSource.getRepository(Addon).save(addon);
    }

    async getAllAddons(): Promise<string[]> {
        const addons = await this.dataSource.getRepository(Addon).find();
        return addons.map(addon => addon.addonKey);
    }
}