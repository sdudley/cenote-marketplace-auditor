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
    [ConfigKey.DemoMode]: boolean;
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
    SlackChannelExceptions = 'SlackChannelExceptions',
    DemoMode = 'DemoMode'
}

// Helper type to get the value type for a config key
export type ConfigValueForKey<K extends ConfigKey> = ConfigKeyType[K];

// Helper type to get all possible config keys
export type ConfigKeyTypeKeys = keyof ConfigKeyType;

