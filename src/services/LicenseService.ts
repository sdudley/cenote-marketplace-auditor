import { DataSource, Repository } from 'typeorm';
import { License } from '../entities/License';
import { LicenseVersion } from '../entities/LicenseVersion';
import { deepEqual, normalizeObject, computeJsonPaths } from '../utils/objectUtils';
import { printJsonDiff } from '../utils/diffUtils';
import { LicenseData } from '../types/marketplace';
import { IgnoredFieldService } from './IgnoredFieldService';
import { TYPES } from '../config/types';
import { inject, injectable } from 'inversify';

@injectable()
export class LicenseService {
    private licenseRepository: Repository<License>;
    private licenseVersionRepository: Repository<LicenseVersion>;
    private ignoredFields: string[] | null = null;

    constructor(
        @inject(TYPES.DataSource) private dataSource: DataSource,
        @inject(TYPES.IgnoredFieldService) private ignoredFieldService: IgnoredFieldService
    ) {
        this.licenseRepository = this.dataSource.getRepository(License);
        this.licenseVersionRepository = this.dataSource.getRepository(LicenseVersion);
    }

    private async getIgnoredFields(): Promise<string[]> {
        if (this.ignoredFields === null) {
            this.ignoredFields = await this.ignoredFieldService.getIgnoredFields('license');
        }
        return this.ignoredFields;
    }

    private isProperSubsetOfIgnoredFields(changedPaths: string[]): boolean {
        if (changedPaths.length === 0) return false;
        return changedPaths.every(path => this.ignoredFields?.includes(path));
    }

    async processLicenses(licenses: LicenseData[]): Promise<void> {
        let processedCount = 0;
        let totalCount = licenses.length;
        let modifiedCount = 0;
        let skippedCount = 0;

        // Initialize ignored fields list
        await this.getIgnoredFields();

        for (const licenseData of licenses) {
            const entitlementId = licenseData.appEntitlementNumber || licenseData.licenseId;
            const existingLicense = await this.licenseRepository.findOne({ where: { entitlementId } });

            // Normalize the incoming data
            const normalizedData = normalizeObject(licenseData);
            let currentVersion = 1;

            if (existingLicense) {
                // Compare with current data using deepEqual
                if (!deepEqual(existingLicense.data, normalizedData)) {

                    // Compute and print JSONPaths of differences
                    const changedPaths = computeJsonPaths(existingLicense.data, normalizedData);
                    const changedPathsString = changedPaths.join(' | ');

                    // Check if changes are only in ignored fields
                    if (this.isProperSubsetOfIgnoredFields(changedPaths)) {
                        console.log(`Skipping license version creation for license ${entitlementId} - changes only in ignored fields: ${changedPathsString}`);
                        skippedCount++;
                        continue;
                    }

                    console.log(`License changed: ${entitlementId}`);
                    console.log('Changed paths:', changedPathsString);
                    printJsonDiff(existingLicense.data, normalizedData);

                    // Get the current, soon-to-be old version
                    const oldVersion = await this.licenseVersionRepository.findOne({
                        where: { license: existingLicense },
                        order: { createdAt: 'DESC' }
                    });

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
                        await this.licenseVersionRepository.save(oldVersion);
                    }

                    await this.licenseVersionRepository.save(version);

                    // Update the current data
                    existingLicense.data = normalizedData;
                    existingLicense.currentVersion = currentVersion;
                    await this.licenseRepository.save(existingLicense);
                    modifiedCount++;
                }
            } else {
                // Create new license
                const license = new License();
                license.entitlementId = entitlementId;
                license.data = normalizedData;
                await this.licenseRepository.save(license);

                // Create initial version
                const version = new LicenseVersion();
                version.data = normalizedData;
                version.license = license;
                version.entitlementId = entitlementId;
                version.version = currentVersion;
                await this.licenseVersionRepository.save(version);
            }

            processedCount++;
            if (processedCount % 1000 === 0) {
                console.log(`Processed ${processedCount} of ${totalCount} licenses`);
            }
        }
        console.log(`Completed processing ${totalCount} licenses; ${modifiedCount} were updated; ${skippedCount} were skipped due to ignored fields`);
    }
}