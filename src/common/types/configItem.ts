// Define the possible value types for config keys
export type ConfigValueType = 'string' | 'number' | 'boolean';

// Define the type mapping for each config key
export interface ConfigKeyType {
    [ConfigKey.AtlassianAccountUser]: string;
    [ConfigKey.AtlassianAccountApiToken]: string;
    [ConfigKey.AtlassianVendorId]: string;
    [ConfigKey.SchedulerFrequency]: number;
}

// Define the enum with type information
export enum ConfigKey {
    AtlassianAccountUser = 'ATLASSIAN_ACCOUNT_USER',
    AtlassianAccountApiToken = 'ATLASSIAN_ACCOUNT_API_TOKEN',
    AtlassianVendorId = 'ATLASSIAN_VENDOR_ID',
    SchedulerFrequency = 'SCHEDULER_FREQUENCY'
}

// Helper type to get the value type for a config key
export type ConfigValueForKey<K extends ConfigKey> = ConfigKeyType[K];

// Helper type to get all possible config keys
export type ConfigKeyTypeKeys = keyof ConfigKeyType;

// Helper function to get the type of a config key
export function getConfigKeyType(key: ConfigKey): ConfigValueType {
    switch (key) {
        case ConfigKey.AtlassianAccountUser:
        case ConfigKey.AtlassianAccountApiToken:
        case ConfigKey.AtlassianVendorId:
            return 'string';
        case ConfigKey.SchedulerFrequency:
            return 'number';
        default:
            throw new Error(`Unknown config key type for key: ${key}`);
    }
}