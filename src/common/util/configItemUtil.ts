// Helper function to get the type of a config key
import { ConfigKey, ConfigValueType } from '#common/types/configItem.js';

export function getConfigKeyType(key: ConfigKey): ConfigValueType {
    switch (key) {
        case ConfigKey.AtlassianAccountUser:
        case ConfigKey.AtlassianAccountApiToken:
        case ConfigKey.AtlassianVendorId:
        case ConfigKey.AtlassianDeveloperId:
        case ConfigKey.BaseUrl:
        case ConfigKey.SlackBotToken:
        case ConfigKey.SlackChannelSales:
        case ConfigKey.SlackChannelEvaluations:
        case ConfigKey.SlackChannelExceptions:
        case ConfigKey.SlackChannelQuotes:
            return 'string';
        case ConfigKey.SchedulerFrequency:
            return 'number';
        case ConfigKey.DemoMode:
        case ConfigKey.SlackSkipZeroSales:
            return 'boolean';
        default:
            throw new Error(`Unknown config key type for key: ${key}`);
    }
}