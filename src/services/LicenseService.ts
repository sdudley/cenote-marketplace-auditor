import { DataSource } from 'typeorm';
import { License } from '../entities/License';
import { LicenseVersion } from '../entities/LicenseVersion';
import { deepEqual } from '../utils/objectUtils';

export class LicenseService {
    constructor(private dataSource: DataSource) {}

    async processLicenses(licenses: any[]): Promise<void> {
        let processedCount = 0;
        let totalCount = licenses.length;

        for (const licenseData of licenses) {
            const existingLicense = await this.dataSource.getRepository(License)
                .findOne({ where: { marketplaceLicenseId: licenseData.id } });

            if (existingLicense) {
                // Compare with current data using deepEqual
                if (!deepEqual(existingLicense.currentData, licenseData)) {
                    console.log(`License changed: ${licenseData.id}`);
                    // Create new version
                    const version = new LicenseVersion();
                    version.data = licenseData;
                    version.license = existingLicense;
                    await this.dataSource.getRepository(LicenseVersion).save(version);

                    // Update current data
                    existingLicense.currentData = licenseData;
                    await this.dataSource.getRepository(License).save(existingLicense);
                }
            } else {
                // Create new license
                const license = new License();
                license.marketplaceLicenseId = licenseData.id;
                license.currentData = licenseData;
                await this.dataSource.getRepository(License).save(license);

                // Create initial version
                const version = new LicenseVersion();
                version.data = licenseData;
                version.license = license;
                await this.dataSource.getRepository(LicenseVersion).save(version);
            }

            processedCount++;
            if (processedCount % 100 === 0) {
                console.log(`Processed ${processedCount} of ${totalCount} licenses`);
            }
        }
        console.log(`Completed processing ${totalCount} licenses`);
    }
} 