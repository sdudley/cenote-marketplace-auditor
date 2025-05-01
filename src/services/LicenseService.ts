import { DataSource, Repository } from 'typeorm';
import { License } from '../entities/License';
import { LicenseVersion } from '../entities/LicenseVersion';
import { deepEqual, normalizeObject, computeJsonPaths } from '../utils/objectUtils';
import { printJsonDiff } from '../utils/diffUtils';
import { LicenseData } from '../types/marketplace';

export class LicenseService {
    private licenseRepository: Repository<License>;
    private licenseVersionRepository: Repository<LicenseVersion>;

    constructor(private dataSource: DataSource) {
        this.licenseRepository = this.dataSource.getRepository(License);
        this.licenseVersionRepository = this.dataSource.getRepository(LicenseVersion);
    }

    async processLicenses(licenses: LicenseData[]): Promise<void> {
        let processedCount = 0;
        let totalCount = licenses.length;
        let modifiedCount = 0;

        for (const licenseData of licenses) {
            const licenseId = licenseData.appEntitlementNumber || licenseData.licenseId;
            const existingLicense = await this.licenseRepository.findOne({ where: { marketplaceLicenseId: licenseId } });

            // Normalize the incoming data
            const normalizedData = normalizeObject(licenseData);

            if (existingLicense) {
                // Compare with current data using deepEqual
                if (!deepEqual(existingLicense.currentData, normalizedData)) {
                    console.log(`License changed: ${licenseId}`);
                    printJsonDiff(existingLicense.currentData, normalizedData);

                    // Compute and print JSONPaths of differences
                    const changedPaths = computeJsonPaths(existingLicense.currentData, normalizedData);
                    console.log('Changed paths:', changedPaths.join(' | '));

                    // Get the current, soon-to-be old version
                    const oldVersion = await this.licenseVersionRepository.findOne({
                        where: { license: existingLicense },
                        order: { createdAt: 'DESC' }
                    });

                    // Create new version
                    const version = new LicenseVersion();
                    version.data = normalizedData;
                    version.license = existingLicense;

                    // Set up the version chain
                    if (oldVersion) {
                        version.priorLicense = oldVersion;
                        oldVersion.nextLicense = version;
                        await this.licenseVersionRepository.save(oldVersion);
                    }

                    await this.licenseVersionRepository.save(version);

                    // Update the current data
                    existingLicense.currentData = normalizedData;
                    await this.licenseRepository.save(existingLicense);
                    modifiedCount++;
                }
            } else {
                // Create new license
                const license = new License();
                license.marketplaceLicenseId = licenseData.appEntitlementNumber || licenseData.licenseId;
                license.currentData = normalizedData;
                await this.licenseRepository.save(license);

                // Create initial version
                const version = new LicenseVersion();
                version.data = normalizedData;
                version.license = license;
                await this.licenseVersionRepository.save(version);
            }

            processedCount++;
            if (processedCount % 1000 === 0) {
                console.log(`Processed ${processedCount} of ${totalCount} licenses`);
            }
        }
        console.log(`Completed processing ${totalCount} licenses; ${modifiedCount} were updated`);
    }
}