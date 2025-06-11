import { inject, injectable } from 'inversify';
import { WebClient, KnownBlock, Block } from '@slack/web-api';
import { ConfigDao } from '#server/database/ConfigDao';
import { ConfigKey } from '#common/types/configItem';
import { SlackChannelType } from '#common/types/slackChannel';
import { TYPES } from '#server/config/types';
import { encodeSlackText } from '../utils/SlackUtils';
import { formatCurrency } from '#common/utils/formatCurrency';
import { dateDiff } from '#common/utils/dateUtils';
import { Transaction } from '#common/entities/Transaction';
import { License } from '#common/entities/License';
import { LicenseData } from '#common/types/marketplace';

export type SlackBlock = (KnownBlock | Block);

export interface SlackTransactionData {
    saleDate: string;
    addonName: string;
    licenseType: string;
    hosting: string;
    tier: string;

    company: string|undefined;

    maintenanceStartDate: string;
    maintenanceEndDate: string;

    entitlementId: string;
    vendorAmount: number;
}

export interface SlackLicenseData {
    lastUpdated: string;
    entitlementId: string;
    addonName: string;
    hosting: string;
    company: string;
    maintenanceStartDate: string;
    maintenanceEndDate: string|undefined;
    oldMaintenanceEndDate: string|undefined;
    extended: boolean;
}

@injectable()
export class SlackService {
    private client: WebClient | null = null;
    private channelCache: Map<string, string> = new Map(); // channel name -> channel ID

    constructor(
        @inject(TYPES.ConfigDao) private readonly configDao: ConfigDao
    ) {}

    private async getClient(): Promise<WebClient | null> {
        if (this.client) {
            return this.client;
        }

        const token = await this.configDao.get<string>(ConfigKey.SlackBotToken);
        if (!token) {
            return null;
        }

        this.client = new WebClient(token);
        return this.client;
    }

    private async getChannelId(channelName: string): Promise<string | null> {
        const client = await this.getClient();
        if (!client) {
            return null;
        }

        // Check cache first
        const cachedId = this.channelCache.get(channelName);
        if (cachedId) {
            return cachedId;
        }

        try {
            // Clean the channel name (remove # if present)
            const cleanName = channelName.startsWith('#') ? channelName.slice(1) : channelName;

            // Fetch all channels
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
            this.channelCache.set(channelName, channel.id);
            return channel.id;
        } catch (error) {
            console.error('Error fetching channel ID:', error);
            throw error;
        }
    }

    async postMessage(channelType: SlackChannelType, text: string, blocks?: SlackBlock[]): Promise<void> {
        const channelName = await this.configDao.get<string>(ConfigKey[`SlackChannel${channelType}`]);
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
                blocks
            });
        } catch (error) {
            console.error('Error posting message to Slack:', error);
        }
    }

    public mapLicenseForSlack(opts: { license: License; oldLicenseData: LicenseData|undefined; extended: boolean; }): SlackLicenseData|undefined {
        const { license, oldLicenseData, extended } = opts;
        const { addonName, lastUpdated } = license.data;
        const { licenseType } = license.data;
        const { hosting } = license.data;
        const { company } = license.data.contactDetails;
        const { maintenanceStartDate, maintenanceEndDate } = license.data;

        if (licenseType !== 'EVALUATION') {
            return undefined;
        }

        return {
            lastUpdated,
            addonName,
            hosting,
            company: company ?? 'Unknown',
            maintenanceStartDate,
            maintenanceEndDate: maintenanceEndDate ?? 'Unknown',
            oldMaintenanceEndDate: oldLicenseData?.maintenanceEndDate,
            entitlementId: license.entitlementId,
            extended
        };
    }

    public mapTransactionForSlack(transaction: Transaction): SlackTransactionData {
        const { addonName } = transaction.data;
        const { saleDate, vendorAmount, tier } = transaction.data.purchaseDetails;
        const { company } = transaction.data.customerDetails;
        const { maintenanceStartDate, maintenanceEndDate, licenseType, hosting } = transaction.data.purchaseDetails;

        return {
            saleDate,
            addonName,
            licenseType,
            hosting,
            vendorAmount,
            tier,
            company: company ?? 'Unknown',
            maintenanceStartDate: maintenanceStartDate,
            maintenanceEndDate: maintenanceEndDate,
            entitlementId: transaction.entitlementId
        };
    }

    public async postNewTransactionsToSlack(transactions: SlackTransactionData[]): Promise<void> {
        const totalVendorAmount = transactions.reduce((acc, t) => acc + t.vendorAmount, 0);

        const message = encodeSlackText(`🎉 ${transactions.length} New Sale${transactions.length > 1 ? 's' : ''} - ${formatCurrency(totalVendorAmount)}`);

        const blocks : SlackBlock[] = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: message,
                    emoji: true
                }
            },
            {
                type: 'divider'
            }
        ];

        // Add a block for each transaction
        for (const t of transactions) {
            const maintenanceDays = dateDiff(t.maintenanceStartDate, t.maintenanceEndDate);

            blocks.push(
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: encodeSlackText(`*${t.addonName}* - ${formatCurrency(t.vendorAmount)}`)
                    }
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: encodeSlackText(`*Customer:*\n${t.company}`)
                        },
                        {
                            type: 'mrkdwn',
                            text: encodeSlackText(`*Entitlement ID:*\n${t.entitlementId}`)
                        },
                        {
                            type: 'mrkdwn',
                            text: encodeSlackText(`*Hosting:*\n${t.hosting}`)
                        },
                        {
                            type: 'mrkdwn',
                            text: encodeSlackText(`*Tier:*\n${t.tier}`)
                        },
                        {
                            type: 'mrkdwn',
                            text: encodeSlackText(`*Sale Date:*\n${t.saleDate}`)
                        }
                    ]
                },
                {
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: encodeSlackText(`Maintenance: ${maintenanceDays} days (${t.maintenanceStartDate} to ${t.maintenanceEndDate})`)
                        }
                    ]
                },
                {
                    type: 'divider'
                }
            );
        }

        await this.postMessage(SlackChannelType.Sales, message, blocks);
    }

    public async postNewLicensesToSlack(licenses: SlackLicenseData[]): Promise<void> {
        const message = encodeSlackText(`🔍 ${licenses.length} New Evaluation${licenses.length > 1 ? 's' : ''}`);

        const blocks: SlackBlock[] = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: message,
                    emoji: true
                }
            },
            {
                type: 'divider'
            }
        ];

        // Add a block for each license
        for (const l of licenses) {
            const maintenanceDays = l.maintenanceEndDate ? dateDiff(l.maintenanceStartDate, l.maintenanceEndDate) : 'Unknown';
            let extensionText = '';

            if (l.extended && l.oldMaintenanceEndDate && l.maintenanceEndDate) {
                const extensionDays = dateDiff(l.oldMaintenanceEndDate, l.maintenanceEndDate);
                const extensionDaysText = extensionDays > 30 ?
                    `*${extensionDays} days*` :
                    `${extensionDays} days`;
                extensionText = `\nExtended by ${extensionDaysText} (${l.oldMaintenanceEndDate} to ${l.maintenanceEndDate})`;
            }

            const maintenanceDaysText = typeof maintenanceDays === 'number' && maintenanceDays > 30 ?
                `*${maintenanceDays} days*` :
                `${maintenanceDays} days`;

            blocks.push(
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: encodeSlackText(`*${l.company}* - ${l.addonName}`)
                    }
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: encodeSlackText(`*Hosting:*\n${l.hosting}`)
                        },
                        {
                            type: 'mrkdwn',
                            text: encodeSlackText(`*Entitlement ID:*\n${l.entitlementId}`)
                        },
                        {
                            type: 'mrkdwn',
                            text: encodeSlackText(`*Last Updated:*\n${l.lastUpdated}`)
                        },
                        {
                            type: 'mrkdwn',
                            text: encodeSlackText(`*Evaluation Period*\n${maintenanceDaysText} (${l.maintenanceStartDate} to ${l.maintenanceEndDate})${extensionText}`)
                        }

                    ]
                },
                {
                    type: 'divider'
                }
            );
        }

        await this.postMessage(SlackChannelType.Evaluations, message, blocks);
    }
}