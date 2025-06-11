import { inject, injectable } from 'inversify';
import { WebClient } from '@slack/web-api';
import { ConfigDao } from '#server/database/ConfigDao';
import { ConfigKey } from '#common/types/configItem';
import { SlackChannelType } from '#common/types/slackChannel';
import { TYPES } from '#server/config/types';

@injectable()
export class SlackService {
    private client: WebClient | null = null;
    private channelCache: Map<string, string> = new Map(); // channel name -> channel ID

    constructor(
        @inject(TYPES.ConfigDao) private readonly configDao: ConfigDao
    ) {}

    private async getClient(): Promise<WebClient | null> {
        if (!this.client) {
            const token = await this.configDao.get<string>(ConfigKey.SlackBotToken);

            if (!token) {
                return null;
            }

            this.client = new WebClient(token);
        }
        return this.client;
    }

    private async getChannelId(channelName: string): Promise<string | null> {
        // Remove # if present
        const cleanName = channelName.startsWith('#') ? channelName.slice(1) : channelName;

        // Check cache first
        const cachedId = this.channelCache.get(cleanName);
        if (cachedId) {
            return cachedId;
        }

        const client = await this.getClient();

        if (!client) {
            return null;
        }

        try {
            // List all channels
            const result = await client.conversations.list({
                types: 'public_channel,private_channel',
                limit: 1000
            });

            if (!result.ok || !result.channels) {
                throw new Error('Failed to fetch channels');
            }

            // Find the channel by name
            const channel = result.channels.find(c => c.name === cleanName);
            if (!channel || !channel.id) {
                throw new Error(`Channel #${cleanName} not found`);
            }

            // Cache the result
            this.channelCache.set(cleanName, channel.id);
            return channel.id;
        } catch (error) {
            console.error('Error fetching channel ID:', error);
            throw error;
        }
    }

    async postMessage(channelType: SlackChannelType, text: string): Promise<void> {
        const configKey = ConfigKey[`SlackChannel${channelType}`];
        const channelName = await this.configDao.get<string>(configKey);
        if (!channelName) {
            return;
        }

        const channelId = await this.getChannelId(channelName);
        if (!channelId) {
            return;
        }

        const client = await this.getClient();
        if (!client) {
            return;
        }

        try {
            await client.chat.postMessage({
                channel: channelId,
                text,
            });
        } catch (error) {
            console.error('Error posting message to Slack:', error);
        }
    }
}