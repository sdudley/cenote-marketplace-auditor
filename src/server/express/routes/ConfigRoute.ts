import { Router } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../../config/types';
import { ConfigDao } from '../../database/ConfigDao';
import { ConfigKey, ConfigValueType, getConfigKeyType, ConfigValueForKey } from '#common/types/configItem';

interface ConfigValue {
    key: ConfigKey;
    value: string | number | boolean;
    description?: string;
}

@injectable()
export class ConfigRoute {
    private router: Router;

    constructor(
        @inject(TYPES.ConfigDao) private configDao: ConfigDao
    ) {
        this.router = Router();
        this.initializeRoutes();
    }

    private validateConfigValue(key: ConfigKey, value: unknown): value is ConfigValueForKey<typeof key> {
        const expectedType = getConfigKeyType(key);

        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number';
            case 'boolean':
                return typeof value === 'boolean';
            default:
                return false;
        }
    }

    private initializeRoutes(): void {
        // Get all config values
        this.router.get('/', async (req, res) => {
            try {
                const values: ConfigValue[] = [];
                for (const key of Object.values(ConfigKey)) {
                    const value = await this.configDao.get(key);
                    if (value !== null) {
                        values.push({ key: key as ConfigKey, value });
                    }
                }
                res.json(values);
            } catch (error) {
                console.error('Error getting config values:', error);
                res.status(500).json({ error: 'Failed to get config values' });
            }
        });

        // Get a specific config value
        this.router.get('/:key', async (req, res) => {
            try {
                const key = req.params.key as ConfigKey;
                if (!Object.values(ConfigKey).includes(key)) {
                    return res.status(400).json({ error: 'Invalid config key' });
                }

                const value = await this.configDao.get(key);
                if (value === null) {
                    return res.status(404).json({ error: 'Config value not found' });
                }

                res.json({ key, value });
            } catch (error) {
                console.error('Error getting config value:', error);
                res.status(500).json({ error: 'Failed to get config value' });
            }
        });

        // Set a config value
        this.router.post('/:key', async (req, res) => {
            try {
                const key = req.params.key as ConfigKey;
                if (!Object.values(ConfigKey).includes(key)) {
                    return res.status(400).json({ error: 'Invalid config key' });
                }

                const { value, description } = req.body;
                if (value === undefined) {
                    return res.status(400).json({ error: 'Value is required' });
                }

                if (!this.validateConfigValue(key, value)) {
                    const expectedType = getConfigKeyType(key);
                    return res.status(400).json({
                        error: `Invalid value type. Expected ${expectedType} for key ${key}`
                    });
                }

                await this.configDao.set(key, value, description);
                res.status(200).json({ key, value, description });
            } catch (error) {
                console.error('Error setting config value:', error);
                res.status(500).json({ error: 'Failed to set config value' });
            }
        });

        // Delete a config value
        this.router.delete('/:key', async (req, res) => {
            try {
                const key = req.params.key as ConfigKey;
                if (!Object.values(ConfigKey).includes(key)) {
                    return res.status(400).json({ error: 'Invalid config key' });
                }

                await this.configDao.delete(key);
                res.status(204).send();
            } catch (error) {
                console.error('Error deleting config value:', error);
                res.status(500).json({ error: 'Failed to delete config value' });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}

