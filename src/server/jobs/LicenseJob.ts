import { Readable } from 'stream';
import StreamArray from 'stream-json/streamers/StreamArray';
import { License } from '#common/entities/License';
import { LicenseVersion } from '#common/entities/LicenseVersion';
import { deepEqual, normalizeObject, computeJsonPaths } from '#common/util/objectUtils';
import { printJsonDiff } from '#common/util/jsonDiff';
import { LicenseData } from '#common/types/marketplace';
import { IgnoredFieldService } from '../services/IgnoredFieldService';
import { TYPES } from '../config/types';
import { inject, injectable } from 'inversify';
import { LicenseDao } from '../database/dao/LicenseDao';
import { isProperSubsetOfFields } from '#common/util/fieldUtils';
import { LicenseVersionDao } from '#server/database/dao/LicenseVersionDao';
import { SlackLicenseData, SlackService } from '#server/services/SlackService';

export interface ProcessOneLicenseResult {
    processed: number;
    new: number;
    modified: number;
    skipped: number;
    slackData?: SlackLicenseData;
}

const ignoreLicenseFieldsForDiffDisplay = [
    'lastUpdated',
    'contactDetails.',
    'paymentStatus',
    'attribution',
    'parentProductBillingCycle',
    'transactionAccountId',
    'evaluationOpportunitySize'
];

@injectable()
export class LicenseJob {
    private ignoredFields: string[] | null = null;

    constructor(
        @inject(TYPES.IgnoredFieldService) private ignoredFieldService: IgnoredFieldService,
        @inject(TYPES.LicenseDao) private licenseDao: LicenseDao,
        @inject(TYPES.LicenseVersionDao) private licenseVersionDao: LicenseVersionDao,
        @inject(TYPES.SlackService) private slackService: SlackService
    ) {
    }

    private async getIgnoredFields(): Promise<string[]> {
        if (this.ignoredFields === null) {
            this.ignoredFields = await this.ignoredFieldService.getIgnoredFields('license');
        }
        return this.ignoredFields;
    }

    private isProperSubsetOfIgnoredFields(changedPaths: string[]): boolean {
        return isProperSubsetOfFields(changedPaths, this.ignoredFields);
    }

    private isProperSubsetOfFields(changedPaths: string[], fieldsToIgnore: string[]|null): boolean {
        if (changedPaths.length === 0) {
            return false;
        }

        return changedPaths.every(path => fieldsToIgnore?.some(field => path.includes(field)));
    }

    // Atlassian constantly updates sandbox instances with the exact user count of the sandbox,
    // for which we don't need to create tons of new database records.

    private ignoreSandboxTierChanges(changedPaths: string[], normalizedData: LicenseData): boolean {
        return normalizedData.installedOnSandbox==='Yes' &&
                changedPaths.length===2 &&
                changedPaths.some(path => path.includes('tier')) &&
                changedPaths.some(path => path.includes('lastUpdated'));
    }

    /**
     * Process a single license. Returns counts to increment (each 0 or 1) and optional Slack payload.
     */
    async processOneLicense(licenseData: LicenseData): Promise<ProcessOneLicenseResult> {
        const entitlementId = this.licenseDao.getEntitlementIdForLicense(licenseData);
        const existingLicense = await this.licenseDao.getLicenseForEntitlementId(entitlementId);

        const normalizedData: LicenseData = normalizeObject(licenseData);
        let currentVersion = 1;

        if (existingLicense) {
            if (!deepEqual(existingLicense.data, normalizedData)) {
                const changedPaths = computeJsonPaths(existingLicense.data, normalizedData);
                const changedPathsString = changedPaths.join(' | ');

                if (this.isProperSubsetOfIgnoredFields(changedPaths) ||
                    this.ignoreSandboxTierChanges(changedPaths, normalizedData)) {
                    return { processed: 1, new: 0, modified: 0, skipped: 1 };
                }

                console.log(`\n\nLicense changed: ${entitlementId}`);
                console.log('Changed paths:', changedPathsString);

                if (!this.isProperSubsetOfFields(changedPaths, ignoreLicenseFieldsForDiffDisplay)) {
                    printJsonDiff(existingLicense.data, normalizedData);
                }

                const oldVersionNum = await this.licenseVersionDao.getLicenseHighestVersion(existingLicense);
                currentVersion = oldVersionNum + 1;

                const version = new LicenseVersion();
                version.data = normalizedData;
                version.license = existingLicense;
                version.entitlementId = entitlementId;
                version.diff = changedPaths.length > 0 ? changedPaths.join(' | ') : undefined;
                version.version = currentVersion;

                await this.licenseVersionDao.saveLicenseVersions(version);

                existingLicense.data = normalizedData;
                existingLicense.currentVersion = currentVersion;
                await this.licenseDao.saveLicense(existingLicense);

                let slackData: SlackLicenseData | undefined;
                if (normalizedData.maintenanceEndDate &&
                    existingLicense.data.maintenanceEndDate &&
                    normalizedData.maintenanceEndDate > existingLicense.data.maintenanceEndDate) {
                    slackData = this.slackService.mapLicenseForSlack({ license: existingLicense, oldLicenseData: existingLicense.data, extended: true }) ?? undefined;
                }

                return { processed: 1, new: 0, modified: 1, skipped: 0, slackData };
            }
            return { processed: 1, new: 0, modified: 0, skipped: 0 };
        }

        const license = new License();
        license.entitlementId = entitlementId;
        license.data = normalizedData;
        license.currentVersion = currentVersion;
        await this.licenseDao.saveLicense(license);

        const version = new LicenseVersion();
        version.data = normalizedData;
        version.license = license;
        version.entitlementId = entitlementId;
        version.version = currentVersion;
        await this.licenseVersionDao.saveLicenseVersions(version);

        const { maintenanceStartDate, maintenanceEndDate, tier } = normalizedData;
        const customerName = normalizedData.contactDetails.company;
        console.log(`Created new license ${entitlementId}: ${maintenanceStartDate}-${maintenanceEndDate} for ${customerName} at tier ${tier}`);

        const slackData = this.slackService.mapLicenseForSlack({ license, oldLicenseData: undefined, extended: false });
        return { processed: 1, new: 1, modified: 0, skipped: 0, slackData: slackData ?? undefined };
    }

    /**
     * Process licenses from one or more API response streams. Prefix/suffix (counts, Slack) run once; each record is processed as it is received.
     */
    async processLicensesFromStreams(
        streams: Readable[],
        onProgress?: (current: number, total?: number) => void | Promise<void>
    ): Promise<void> {
        await this.getIgnoredFields();
        const originalLicenseCount = await this.licenseDao.getLicenseCount();
        const newLicenses: SlackLicenseData[] = [];

        let processedCount = 0;
        let modifiedCount = 0;
        let skippedCount = 0;
        let newCount = 0;

        await onProgress?.(0);

        for (const responseStream of streams) {
            const parserStream = StreamArray.withParser();
            responseStream.pipe(parserStream as NodeJS.WritableStream);

            for await (const data of parserStream as AsyncIterable<{ value: LicenseData }>) {
                const result = await this.processOneLicense(data.value);
                processedCount += result.processed;
                newCount += result.new;
                modifiedCount += result.modified;
                skippedCount += result.skipped;
                if (result.slackData) newLicenses.push(result.slackData);

                if ((processedCount % 100) === 0) {
                    await onProgress?.(processedCount);
                }
            }
        }

        await onProgress?.(processedCount, processedCount);

        console.log(`Completed processing ${processedCount} licenses; ${newCount} were new; ${modifiedCount} were updated; ${skippedCount} were skipped due to ignored fields`);

        if (originalLicenseCount > 0 &&
            newLicenses.length > 0 &&
            processedCount !== newCount) {
            await this.slackService.postNewLicensesToSlack(newLicenses);
        }
    }
}