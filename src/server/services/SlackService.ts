import { inject, injectable } from 'inversify';
import { WebClient, KnownBlock, Block } from '@slack/web-api';
import { ConfigDao } from '#server/database/dao/ConfigDao';
import { ConfigKey } from '#common/types/configItem';
import { SlackChannelType } from '#common/types/slackChannel';
import { TYPES } from '#server/config/types';
import { encodeSlackText } from '#server/util/SlackUtils';
import { formatCurrency } from '#common/util/formatCurrency';
import { dateDiff } from '#common/util/dateUtils';
import { Transaction } from '#common/entities/Transaction';
import { License } from '#common/entities/License';
import { LicenseData } from '#common/types/marketplace';
import { TransactionValidationResult } from './transactionValidation/types';

export type SlackBlock = (KnownBlock | Block);

export interface SlackTransactionData {
    saleDate: string;
    saleType: string;
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
    evaluationOpportunitySize: string|undefined;
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
        const { evaluationOpportunitySize } = license.data;

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
            extended,
            evaluationOpportunitySize
        };
    }

    public mapTransactionForSlack(transaction: Transaction): SlackTransactionData {
        const { addonName } = transaction.data;
        const { saleDate, saleType, vendorAmount, tier } = transaction.data.purchaseDetails;
        const { company } = transaction.data.customerDetails;
        const { maintenanceStartDate, maintenanceEndDate, licenseType, hosting } = transaction.data.purchaseDetails;

        return {
            saleDate,
            addonName,
            licenseType,
            hosting,
            vendorAmount,
            tier,
            saleType,
            company: company ?? 'Unknown',
            maintenanceStartDate: maintenanceStartDate,
            maintenanceEndDate: maintenanceEndDate,
            entitlementId: transaction.entitlementId
        };
    }

    public async postNewTransactionsToSlack(transactions: SlackTransactionData[]): Promise<void> {
        const totalVendorAmount = transactions.reduce((acc, t) => acc + t.vendorAmount, 0);

        // Slack has a limit of 50 blocks per message
        // Header + divider = 2 blocks
        // Per transaction: 4 blocks (section, section with fields, context, divider)
        // Be conservative: use 11 transactions per message to ensure we stay under 50
        // 2 + (4 * 11) = 46 blocks (safe margin)
        const MAX_BLOCKS = 50;
        const BLOCKS_PER_TRANSACTION = 4;
        const BLOCKS_FOR_HEADER_AND_DIVIDER = 2;
        const maxTransactionsPerMessage = Math.floor((MAX_BLOCKS - BLOCKS_FOR_HEADER_AND_DIVIDER - 2) / BLOCKS_PER_TRANSACTION); // -2 for safety margin

        // Split transactions into batches
        const totalMessages = Math.ceil(transactions.length / maxTransactionsPerMessage);

        for (let messageIndex = 0; messageIndex < totalMessages; messageIndex++) {
            const startIndex = messageIndex * maxTransactionsPerMessage;
            const endIndex = Math.min(startIndex + maxTransactionsPerMessage, transactions.length);
            const batch = transactions.slice(startIndex, endIndex);
            const batchVendorAmount = batch.reduce((acc, t) => acc + t.vendorAmount, 0);

            let headerText: string;
            if (totalMessages > 1) {
                headerText = `🎉 ${transactions.length} New Sale${transactions.length > 1 ? 's' : ''} - ${formatCurrency(totalVendorAmount)} (Part ${messageIndex + 1} of ${totalMessages})`;
            } else {
                headerText = `🎉 ${transactions.length} New Sale${transactions.length > 1 ? 's' : ''} - ${formatCurrency(totalVendorAmount)}`;
            }

            const message = encodeSlackText(headerText);

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

            // Add a block for each transaction in this batch
            for (const t of batch) {
                const maintenanceDays = dateDiff(t.maintenanceStartDate, t.maintenanceEndDate);

                blocks.push(
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: encodeSlackText(`*${t.addonName}* - *${t.saleType}* - ${formatCurrency(t.vendorAmount)}`)
                        }
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: encodeSlackText(`Customer:\n*${t.company}*`)
                            },
                            {
                                type: 'mrkdwn',
                                text: encodeSlackText(`Entitlement ID:\n*${t.entitlementId}*`)
                            },
                            {
                                type: 'mrkdwn',
                                text: encodeSlackText(`Hosting:\n*${t.hosting}*`)
                            },
                            {
                                type: 'mrkdwn',
                                text: encodeSlackText(`Tier:\n*${t.tier}*`)
                            },
                            {
                                type: 'mrkdwn',
                                text: encodeSlackText(`Sale Type:\n*${t.saleType}*`)
                            },
                            {
                                type: 'mrkdwn',
                                text: encodeSlackText(`Sale Date:\n*${t.saleDate}*`)
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

            // Safety check: ensure we don't exceed Slack's block limit
            if (blocks.length > MAX_BLOCKS) {
                console.error(`Error: Transaction message exceeds ${MAX_BLOCKS} blocks (${blocks.length}). This should not happen.`);
                // Truncate to be safe
                blocks.splice(MAX_BLOCKS);
            }

            await this.postMessage(SlackChannelType.Sales, message, blocks);
        }
    }

    public async postNewLicensesToSlack(licenses: SlackLicenseData[]): Promise<void> {
        // Slack has a limit of 50 blocks per message
        // Header + divider = 2 blocks
        // Per license: 3 blocks (section, section with fields, divider)
        // Be conservative: use 15 licenses per message to ensure we stay under 50
        // 2 + (3 * 15) = 47 blocks (safe margin)
        const MAX_BLOCKS = 50;
        const BLOCKS_PER_LICENSE = 3;
        const BLOCKS_FOR_HEADER_AND_DIVIDER = 2;
        const maxLicensesPerMessage = Math.floor((MAX_BLOCKS - BLOCKS_FOR_HEADER_AND_DIVIDER - 1) / BLOCKS_PER_LICENSE); // -1 for safety margin

        // Split licenses into batches
        const totalMessages = Math.ceil(licenses.length / maxLicensesPerMessage);

        for (let messageIndex = 0; messageIndex < totalMessages; messageIndex++) {
            const startIndex = messageIndex * maxLicensesPerMessage;
            const endIndex = Math.min(startIndex + maxLicensesPerMessage, licenses.length);
            const batch = licenses.slice(startIndex, endIndex);

            let headerText: string;
            if (totalMessages > 1) {
                headerText = `🔍 ${licenses.length} New Evaluation${licenses.length > 1 ? 's' : ''} (Part ${messageIndex + 1} of ${totalMessages})`;
            } else {
                headerText = `🔍 ${licenses.length} New Evaluation${licenses.length > 1 ? 's' : ''}`;
            }

            const message = encodeSlackText(headerText);

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

            // Add a block for each license in this batch
            for (const l of batch) {
                const maintenanceDays = l.maintenanceEndDate ? dateDiff(l.maintenanceStartDate, l.maintenanceEndDate) : 'Unknown';
                let extensionText = '';
                let opportunityText = '';

                if (l.extended && l.oldMaintenanceEndDate && l.maintenanceEndDate) {
                    const extensionDays = dateDiff(l.oldMaintenanceEndDate, l.maintenanceEndDate);
                    const extensionDaysText = extensionDays > 30 ?
                        `*${extensionDays} days*` :
                        `${extensionDays} days`;
                    extensionText = `\nExtended by ${extensionDaysText} (${l.oldMaintenanceEndDate} to ${l.maintenanceEndDate})`;
                }

                if (l.evaluationOpportunitySize) {
                    opportunityText = `\nOpportunity Size:\n*${l.evaluationOpportunitySize}*`;
                }

                const maintenanceDaysText = `${maintenanceDays} days`;

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
                                text: encodeSlackText(`Hosting:\n*${l.hosting}*`)
                            },
                            {
                                type: 'mrkdwn',
                                text: encodeSlackText(`Entitlement ID:\n*${l.entitlementId}*`)
                            },
                            {
                                type: 'mrkdwn',
                                text: encodeSlackText(`Last Updated:\n*${l.lastUpdated}*`)
                            },
                            {
                                type: 'mrkdwn',
                                text: encodeSlackText(`Evaluation Period:\n*${maintenanceDaysText}* (${l.maintenanceStartDate} to ${l.maintenanceEndDate})${opportunityText}${extensionText}`)
                            }

                        ]
                    },
                    {
                        type: 'divider'
                    }
                );
            }

            // Safety check: ensure we don't exceed Slack's block limit
            if (blocks.length > MAX_BLOCKS) {
                console.error(`Error: License message exceeds ${MAX_BLOCKS} blocks (${blocks.length}). This should not happen.`);
                // Truncate to be safe
                blocks.splice(MAX_BLOCKS);
            }

            await this.postMessage(SlackChannelType.Evaluations, message, blocks);
        }
    }

    public async postExceptionToSlack(opts: { transaction: Transaction; validationResult: TransactionValidationResult }): Promise<void> {
        const { transaction, validationResult } = opts;
        const { addonName } = transaction.data;
        const { saleDate, licenseType, hosting, tier, purchasePrice } = transaction.data.purchaseDetails;
        const { company } = transaction.data.customerDetails;
        const { expectedVendorAmount, vendorAmount, price, notes } = validationResult;

        const vendorDifference = vendorAmount - expectedVendorAmount;

        const message = encodeSlackText(`⚠️ Transaction Exception - ${addonName}`);

        // Note: This function is called per exception (not batched), so it should never exceed 50 blocks.
        // Current block count: header (1) + divider (1) + section (1) + section with fields (1) +
        // section header (1) + section with fields (1) + optional notes (1) + divider (1) = 7-8 blocks
        const MAX_BLOCKS = 50;

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
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: encodeSlackText(`Licensee:\n*${company ?? 'Unknown'}*`)
                    },
                    {
                        type: 'mrkdwn',
                        text: encodeSlackText(`Entitlement ID:\n*${transaction.entitlementId}*`)
                    },
                    {
                        type: 'mrkdwn',
                        text: encodeSlackText(`Sale Date:\n*${saleDate}*`)
                    }
                ]
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: encodeSlackText(`Expected:\n${formatCurrency(expectedVendorAmount)}`)
                    },
                    {
                        type: 'mrkdwn',
                        text: encodeSlackText(`Actual:\n${formatCurrency(vendorAmount)}`)
                    },
                    {
                        type: 'mrkdwn',
                        text: encodeSlackText(`Difference:\n*${formatCurrency(vendorDifference)}*`)
                    }
                ]
            }
        ];

        // Add validation notes if any
        if (notes && notes.length > 0) {
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: encodeSlackText(`*Validation Notes:*\n${notes.map(note => `• ${note}`).join('\n')}`)
                }
            });
        }

        blocks.push({
            type: 'divider'
        });

        // Safety check: ensure we don't exceed Slack's block limit
        if (blocks.length > MAX_BLOCKS) {
            console.warn(`Warning: Exception message exceeds ${MAX_BLOCKS} blocks (${blocks.length}). Truncating.`);
            blocks.splice(MAX_BLOCKS);
        }

        await this.postMessage(SlackChannelType.Exceptions, message, blocks);
    }
}
