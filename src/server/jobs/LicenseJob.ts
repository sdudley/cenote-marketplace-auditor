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

    async processLicenses(
        licenses: LicenseData[],
        onProgress?: (current: number, total: number) => void | Promise<void>
    ): Promise<void> {
        let processedCount = 0;
        const totalCount = licenses.length;
        let modifiedCount = 0;
        let skippedCount = 0;
        let newCount = 0;

        const originalLicenseCount = await this.licenseDao.getLicenseCount();
        const newLicenses: SlackLicenseData[] = [];

        // Initialize ignored fields list
        await this.getIgnoredFields();

        await onProgress?.(0, totalCount);

        for (const licenseData of licenses) {
            const entitlementId = this.licenseDao.getEntitlementIdForLicense(licenseData);
            const existingLicense = await this.licenseDao.getLicenseForEntitlementId(entitlementId);

            // Normalize the incoming data
            const normalizedData : LicenseData = normalizeObject(licenseData);
            let currentVersion = 1;

            if (existingLicense) {
                // Compare with current data using deepEqual
                if (!deepEqual(existingLicense.data, normalizedData)) {

                    // Compute and print JSONPaths of differences
                    const changedPaths = computeJsonPaths(existingLicense.data, normalizedData);
                    const changedPathsString = changedPaths.join(' | ');

                    // Check if changes are only in ignored fields
                    if (this.isProperSubsetOfIgnoredFields(changedPaths) ||
                        this.ignoreSandboxTierChanges(changedPaths, normalizedData)) {
                        // console.log(`Skipping license version creation for license ${entitlementId} - changes only in ignored fields: ${changedPathsString}`);
                        skippedCount++;
                        continue;
                    }

                    console.log(`\n\nLicense changed: ${entitlementId}`);

                    console.log('Changed paths:', changedPathsString);

                    if (!this.isProperSubsetOfFields(changedPaths, ignoreLicenseFieldsForDiffDisplay)) {
                        printJsonDiff(existingLicense.data, normalizedData);
                    }

                    // Get the current, soon-to-be old version
                    const oldVersionNum = await this.licenseVersionDao.getLicenseHighestVersion(existingLicense);

                    currentVersion = oldVersionNum + 1;

                    // Create new version
                    const version = new LicenseVersion();
                    version.data = normalizedData;
                    version.license = existingLicense;
                    version.entitlementId = entitlementId;
                    version.diff = changedPaths.length > 0 ? changedPaths.join(' | ') : undefined;
                    version.version = currentVersion;

                    await this.licenseVersionDao.saveLicenseVersions(version);

                    // Update the current data
                    existingLicense.data = normalizedData;
                    existingLicense.currentVersion = currentVersion;
                    await this.licenseDao.saveLicense(existingLicense);

                    // If this is an extension of an existing license, post it to Slack

                    if (normalizedData.maintenanceEndDate &&
                        existingLicense.data.maintenanceEndDate &&
                        normalizedData.maintenanceEndDate > existingLicense.data.maintenanceEndDate) {

                        const sld = this.slackService.mapLicenseForSlack({ license: existingLicense, oldLicenseData: existingLicense.data, extended: true });

                        if (sld) {
                            newLicenses.push(sld);
                        }
                    }

                    modifiedCount++;
                }
            } else {
                // Create new license
                const license = new License();
                license.entitlementId = entitlementId;
                license.data = normalizedData;
                license.currentVersion = currentVersion;
                await this.licenseDao.saveLicense(license);

                // Create initial version
                const version = new LicenseVersion();
                version.data = normalizedData;
                version.license = license;
                version.entitlementId = entitlementId;
                version.version = currentVersion;
                await this.licenseVersionDao.saveLicenseVersions(version);

                const { maintenanceStartDate, maintenanceEndDate, tier } = normalizedData;
                const customerName = normalizedData.contactDetails.company;

                console.log(`Created new license ${entitlementId}: ${maintenanceStartDate}-${maintenanceEndDate} for ${customerName} at tier ${tier}`);

                const sld = this.slackService.mapLicenseForSlack({ license, oldLicenseData: undefined, extended: false });

                if (sld) {
                    newLicenses.push(sld);
                }

                newCount++;
            }

            processedCount++;

            if ((processedCount % 100)===0) {
                await onProgress?.(processedCount, totalCount);
            }
        }

        await onProgress?.(totalCount, totalCount);

        console.log(`Completed processing ${totalCount} licenses; ${newCount} were new; ${modifiedCount} were updated; ${skippedCount} were skipped due to ignored fields`);

        // Only post to Slack if there were existing licenses before the job ran,
        // to avoid spamming ourselves with all licenses on the first run.

        if (originalLicenseCount > 0 &&
            newLicenses.length > 0 &&
            processedCount !== newCount) {
            await this.slackService.postNewLicensesToSlack(newLicenses);
        }
    }
}