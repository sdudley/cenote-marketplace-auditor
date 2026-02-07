import { Readable } from 'stream';
import StreamArray from 'stream-json/streamers/StreamArray';
import { Transaction } from '#common/entities/Transaction';
import { TransactionVersion } from '#common/entities/TransactionVersion';
import { deepEqual, normalizeObject, computeJsonPaths } from '#common/util/objectUtils';
import { printJsonDiff } from '#common/util/jsonDiff';
import { TransactionData } from '#common/types/marketplace';
import { IgnoredFieldService } from '../services/IgnoredFieldService';
import { TYPES } from '../config/types';
import { inject, injectable } from 'inversify';
import { TransactionDao } from '../database/dao/TransactionDao';
import { isProperSubsetOfFields } from '#common/util/fieldUtils';
import { TransactionVersionDao } from '#server/database/dao/TransactionVersionDao';
import { SlackService, SlackTransactionData } from '#server/services/SlackService';

export interface ProcessOneTransactionResult {
    processed: number;
    new: number;
    modified: number;
    skipped: number;
    slackData?: SlackTransactionData;
}

const ignoreTransactionFieldsForDiffDisplay = [
    'lastUpdated',
    'partnerDetails.billingContact.',
    'hostEntitlementId',
    'hostEntitlementNumber',
];

@injectable()
export class TransactionJob {
    private ignoredFields: string[] | null = null;

    constructor(
        @inject(TYPES.IgnoredFieldService) private ignoredFieldService: IgnoredFieldService,
        @inject(TYPES.TransactionDao) private transactionDao: TransactionDao,
        @inject(TYPES.TransactionVersionDao) private transactionVersionDao: TransactionVersionDao,
        @inject(TYPES.SlackService) private slackService: SlackService
    ) {
    }

    private async getIgnoredFields(): Promise<string[]> {
        if (this.ignoredFields === null) {
            this.ignoredFields = await this.ignoredFieldService.getIgnoredFields('transaction');
        }
        return this.ignoredFields;
    }

    private isProperSubsetOfIgnoredFields(changedPaths: string[]): boolean {
        return isProperSubsetOfFields(changedPaths, this.ignoredFields);
    }

    // The proratedDetails array is not sorted by date and the server returns it in an
    // inconsistent order, so we need to sort it to avoid creating new versions every time
    // we are run.

    private normalizeTransactionData(transactionData: TransactionData): TransactionData {
        const normalizedData: TransactionData = normalizeObject(transactionData);
        const proratedDetails = normalizedData.purchaseDetails?.proratedDetails;

        if (Array.isArray(proratedDetails) && proratedDetails.length > 1) {
            normalizedData.purchaseDetails.proratedDetails = [...proratedDetails].sort((a, b) => {
                const dateA = a?.date ?? '';
                const dateB = b?.date ?? '';

                if (dateA !== dateB) {
                    if (!dateA) {
                        return 1;
                    }
                    if (!dateB) {
                        return -1;
                    }
                    return dateA.localeCompare(dateB);
                }

                const addedUsersA = a?.addedUsers ?? Number.NEGATIVE_INFINITY;
                const addedUsersB = b?.addedUsers ?? Number.NEGATIVE_INFINITY;

                return addedUsersB - addedUsersA;
            });
        }

        return normalizedData;
    }

    /**
     * Process a single transaction. Returns counts to increment (each 0 or 1) and optional Slack payload.
     */
    async processOneTransaction(transactionData: TransactionData): Promise<ProcessOneTransactionResult> {
        const transactionKey = this.transactionDao.getKeyForTransaction(transactionData);
        const existingTransaction = await this.transactionDao.getTransactionForKey(transactionKey);
        const entitlementId = this.transactionDao.getEntitlementIdForTransaction(transactionData);

        const normalizedData: TransactionData = this.normalizeTransactionData(transactionData);
        let currentVersion = 1;

        if (existingTransaction) {
            if (!deepEqual(existingTransaction.data, normalizedData)) {
                const changedPaths = computeJsonPaths(existingTransaction.data, normalizedData);
                const changedPathsString = changedPaths.join(' | ');

                if (this.isProperSubsetOfIgnoredFields(changedPaths)) {
                    return { processed: 1, new: 0, modified: 0, skipped: 1 };
                }

                console.log(`Transaction changed: ${transactionKey}`);
                console.log('Changed paths:', changedPathsString);

                if (!isProperSubsetOfFields(changedPaths, ignoreTransactionFieldsForDiffDisplay)) {
                    printJsonDiff(existingTransaction.data, normalizedData);
                }

                const oldVersionNum = await this.transactionVersionDao.getTransactionHighestVersion(existingTransaction);
                currentVersion = oldVersionNum + 1;

                const version = new TransactionVersion();
                version.data = normalizedData;
                version.transaction = existingTransaction;
                version.entitlementId = entitlementId;
                version.diff = changedPaths.length > 0 ? changedPaths.join(' | ') : undefined;
                version.version = currentVersion;

                await this.transactionVersionDao.saveTransactionVersions(version);

                existingTransaction.data = normalizedData;
                existingTransaction.currentVersion = currentVersion;
                await this.transactionDao.saveTransaction(existingTransaction);
                return { processed: 1, new: 0, modified: 1, skipped: 0 };
            }
            return { processed: 1, new: 0, modified: 0, skipped: 0 };
        }

        const transaction = new Transaction();
        transaction.marketplaceTransactionId = transactionKey;
        transaction.data = normalizedData;
        transaction.entitlementId = entitlementId;
        transaction.currentVersion = currentVersion;
        await this.transactionDao.saveTransaction(transaction);

        const version = new TransactionVersion();
        version.data = normalizedData;
        version.transaction = transaction;
        version.entitlementId = entitlementId;
        version.version = currentVersion;
        await this.transactionVersionDao.saveTransactionVersions(version);

        const { saleDate, vendorAmount, tier } = normalizedData.purchaseDetails;
        const customerName = normalizedData.customerDetails.company;
        const { maintenanceStartDate, maintenanceEndDate } = normalizedData.purchaseDetails;

        console.log(`Created new transaction: ${saleDate} $${vendorAmount} for ${entitlementId} (${customerName}) at tier ${tier}, with maintenance from ${maintenanceStartDate} to ${maintenanceEndDate}`);

        const slackData = this.slackService.mapTransactionForSlack(transaction);
        return { processed: 1, new: 1, modified: 0, skipped: 0, slackData };
    }

    /**
     * Process transactions from an API response stream. Prefix/suffix (counts, Slack) run once; each record is processed as it is received.
     */
    async processTransactionsFromStream(
        responseStream: Readable,
        onProgress?: (current: number, total?: number) => void | Promise<void>
    ): Promise<void> {
        await this.getIgnoredFields();
        const originalTransactionCount = await this.transactionDao.getTransactionCount();
        const newTransactions: SlackTransactionData[] = [];

        let processedCount = 0;
        let modifiedCount = 0;
        let newCount = 0;
        let skippedCount = 0;

        await onProgress?.(0);

        const parserStream = StreamArray.withParser();
        responseStream.pipe(parserStream as NodeJS.WritableStream);

        for await (const data of parserStream as AsyncIterable<{ value: TransactionData }>) {
            const result = await this.processOneTransaction(data.value);
            processedCount += result.processed;
            newCount += result.new;
            modifiedCount += result.modified;
            skippedCount += result.skipped;
            if (result.slackData) newTransactions.push(result.slackData);

            if ((processedCount % 100) === 0) {
                await onProgress?.(processedCount);
            }
        }

        await onProgress?.(processedCount, processedCount);

        console.log(`Completed processing ${processedCount} transactions; ${newCount} were new; ${modifiedCount} were updated; ${skippedCount} were skipped due to ignored fields`);

        if (originalTransactionCount > 0 &&
            newTransactions.length > 0 &&
            processedCount !== newCount) {
            await this.slackService.postNewTransactionsToSlack(newTransactions);
        }
    }
}