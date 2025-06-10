import { injectable, inject } from 'inversify';
import { DataSource, Repository } from 'typeorm';
import { TYPES } from '../config/types';
import { Config } from '#common/entities/Config';

type ConfigValue = string | number | boolean;

@injectable()
export class ConfigDao {
    private repository: Repository<Config>;
    private cache: Map<string, ConfigValue> = new Map();
    private cacheInitialized = false;

    constructor(
        @inject(TYPES.DataSource) dataSource: DataSource
    ) {
        this.repository = dataSource.getRepository(Config);
    }

    private async initializeCache(): Promise<void> {
        if (this.cacheInitialized) return;

        const configs = await this.repository.find();
        for (const config of configs) {
            let value: ConfigValue;
            switch (config.type) {
                case 'string':
                    value = config.stringValue!;
                    break;
                case 'number':
                    value = config.numberValue!;
                    break;
                case 'boolean':
                    value = config.booleanValue!;
                    break;
                default:
                    throw new Error(`Unknown config type: ${config.type}`);
            }
            this.cache.set(config.key, value);
        }
        this.cacheInitialized = true;
    }

    async get<T extends ConfigValue>(key: string): Promise<T | null> {
        await this.initializeCache();
        return this.cache.get(key) as T | null;
    }

    async set<T extends ConfigValue>(key: string, value: T, description?: string): Promise<void> {
        const config = await this.repository.findOne({ where: { key } });
        const type = typeof value === 'string' ? 'string' :
                    typeof value === 'number' ? 'number' : 'boolean';

        if (config) {
            // Update existing config
            config.type = type;
            config.stringValue = type === 'string' ? value as string : undefined;
            config.numberValue = type === 'number' ? value as number : undefined;
            config.booleanValue = type === 'boolean' ? value as boolean : undefined;
            if (description) config.description = description;
            await this.repository.save(config);
        } else {
            // Create new config
            const newConfig = new Config();
            newConfig.key = key;
            newConfig.type = type;
            newConfig.stringValue = type === 'string' ? value as string : undefined;
            newConfig.numberValue = type === 'number' ? value as number : undefined;
            newConfig.booleanValue = type === 'boolean' ? value as boolean : undefined;
            if (description) newConfig.description = description;
            await this.repository.save(newConfig);
        }

        // Update cache
        this.cache.set(key, value);
    }

    async delete(key: string): Promise<void> {
        await this.repository.delete({ key });
        this.cache.delete(key);
    }

    async clearCache(): Promise<void> {
        this.cache.clear();
        this.cacheInitialized = false;
    }
}