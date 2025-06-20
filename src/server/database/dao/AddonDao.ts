import { injectable, inject } from 'inversify';
import { DataSource } from 'typeorm';
import { Addon } from '#common/entities/Addon';
import { TYPES } from '../../config/types';

@injectable()
export class AddonDao {
    private readonly addonRepository;
    private parentProductCache: Map<string, string> = new Map();

    constructor(
        @inject(TYPES.DataSource) private dataSource: DataSource
    ) {
        this.addonRepository = this.dataSource.getRepository(Addon);
    }

    async addAddon(opts: { addonKey: string; parentProduct: string; name: string }): Promise<void> {
        const { addonKey, parentProduct, name } = opts;

        const addon = new Addon();
        addon.addonKey = addonKey;
        addon.parentProduct = parentProduct;
        addon.name = name;
        await this.addonRepository.save(addon);

        // Invalidate cache for this addon key
        this.parentProductCache.delete(addonKey);
    }

    public async updateAddon(addon: Addon): Promise<void> {
        await this.addonRepository.save(addon);

        // Invalidate cache for this addon key
        this.parentProductCache.delete(addon.addonKey);
    }

    public async getAddons(): Promise<Addon[]> {
        return await this.addonRepository.find();
    }

    public async getAddonKeys(): Promise<string[]> {
        const addons = await this.addonRepository.find();
        return addons.map(addon => addon.addonKey);
    }

    public async getParentProductForApp(addonKey: string): Promise<string> {
        // Check cache first
        if (this.parentProductCache.has(addonKey)) {
            return this.parentProductCache.get(addonKey)!;
        }

        // Query database if not in cache
        const addon = await this.addonRepository.findOne({
            where: { addonKey }
        });

        if (!addon) {
            throw new Error(`Addon with key '${addonKey}' not found`);
        }

        // Cache the result
        this.parentProductCache.set(addonKey, addon.parentProduct);
        return addon.parentProduct;
    }

    private invalidateCache(): void {
        this.parentProductCache.clear();
    }
}