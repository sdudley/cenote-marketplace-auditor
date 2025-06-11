// Define the possible value types for config keys
export type ConfigValueType = 'string' | 'number' | 'boolean';

// Define the type mapping for each config key
export interface ConfigKeyType {
    [ConfigKey.AtlassianAccountUser]: string;
    [ConfigKey.AtlassianAccountApiToken]: string;
    [ConfigKey.AtlassianVendorId]: string;
    [ConfigKey.SchedulerFrequency]: number;
    [ConfigKey.SlackBotToken]: string;
    [ConfigKey.SlackChannelSales]: string;
    [ConfigKey.SlackChannelEvaluations]: string;
    [ConfigKey.SlackChannelExceptions]: string;
}

// Define the enum with type information
export enum ConfigKey {
    AtlassianAccountUser = 'AtlassianAccountUser',
    AtlassianAccountApiToken = 'AtlassianAccountApiToken',
    AtlassianVendorId = 'AtlassianVendorId',
    SchedulerFrequency = 'SchedulerFrequency',
    SlackBotToken = 'SlackBotToken',
    SlackChannelSales = 'SlackChannelSales',
    SlackChannelEvaluations = 'SlackChannelEvaluations',
    SlackChannelExceptions = 'SlackChannelExceptions'
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
        case ConfigKey.SlackBotToken:
        case ConfigKey.SlackChannelSales:
        case ConfigKey.SlackChannelEvaluations:
        case ConfigKey.SlackChannelExceptions:
            return 'string';
        case ConfigKey.SchedulerFrequency:
            return 'number';
        default:
            throw new Error(`Unknown config key type for key: ${key}`);
    }
}