import { License } from '#common/entities/License';
import { LicenseVersion } from '#common/entities/LicenseVersion';
import { deepEqual, normalizeObject, computeJsonPaths } from '#common/utils/objectUtils';
import { printJsonDiff } from '#common/utils/diffUtils';
import { LicenseData } from '#common/types/marketplace';
import { IgnoredFieldService } from '../services/IgnoredFieldService';
import { TYPES } from '../config/types';
import { inject, injectable } from 'inversify';
import { LicenseDao } from '../database/LicenseDao';
import { isProperSubsetOfFields } from '#common/utils/fieldUtils';

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
        @inject(TYPES.LicenseDao) private licenseDao: LicenseDao
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

    async processLicenses(licenses: LicenseData[]): Promise<void> {
        let processedCount = 0;
        let totalCount = licenses.length;
        let modifiedCount = 0;
        let skippedCount = 0;
        let newCount = 0;

        // Initialize ignored fields list
        await this.getIgnoredFields();

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
                    if (this.isProperSubsetOfIgnoredFields(changedPaths)) {
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
                    const oldVersion = await this.licenseDao.getCurrentLicenseVersionForLicense(existingLicense);

                    currentVersion = oldVersion ? oldVersion.version + 1 : 1;

                    // Create new version
                    const version = new LicenseVersion();
                    version.data = normalizedData;
                    version.license = existingLicense;
                    version.entitlementId = entitlementId;
                    version.diff = changedPaths.length > 0 ? changedPaths.join(' | ') : undefined;
                    version.version = currentVersion;

                    // Set up the version chain
                    if (oldVersion) {
                        version.priorLicenseVersion = oldVersion;
                        oldVersion.nextLicenseVersion = version;
                        // Save both sides of the relationship
                        await this.licenseDao.saveLicenseVersions(oldVersion, version);
                    } else {
                        await this.licenseDao.saveLicenseVersions(version);
                    }

                    // Update the current data
                    existingLicense.data = normalizedData;
                    existingLicense.currentVersion = currentVersion;
                    await this.licenseDao.saveLicense(existingLicense);
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
                await this.licenseDao.saveLicenseVersions(version);

                const { maintenanceStartDate, maintenanceEndDate, tier } = normalizedData;
                const customerName = normalizedData.contactDetails.company;

                console.log(`Created new license ${entitlementId}: ${maintenanceStartDate}-${maintenanceEndDate} for ${customerName} at tier ${tier}`);
                newCount++;
            }

            processedCount++;
        }

        console.log(`Completed processing ${totalCount} licenses; ${newCount} were new; ${modifiedCount} were updated; ${skippedCount} were skipped due to ignored fields`);
    }
}