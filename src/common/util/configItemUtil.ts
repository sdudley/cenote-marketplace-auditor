// Helper function to get the type of a config key
import { ConfigKey, ConfigValueType } from '#common/types/configItem';

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
        case ConfigKey.DemoMode:
            return 'boolean';
        default:
            throw new Error(`Unknown config key type for key: ${key}`);
    }
}