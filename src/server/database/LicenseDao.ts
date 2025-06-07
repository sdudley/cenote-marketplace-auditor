import { DataSource, Repository } from "typeorm";
import { License } from "#common/entities/License";
import { Transaction } from "#common/entities/Transaction";
import { inject, injectable } from "inversify";
import { TYPES } from "../config/types";
import { LicenseVersion } from "#common/entities/LicenseVersion";
import { LicenseData } from "#common/types/marketplace";

@injectable()
export class LicenseDao {
    private licenseRepo: Repository<License>;
    private licenseVersionRepo: Repository<LicenseVersion>;

    constructor(@inject(TYPES.DataSource) dataSource: DataSource) {
        this.licenseRepo = dataSource.getRepository(License);
        this.licenseVersionRepo = dataSource.getRepository(LicenseVersion);
    }

    public getEntitlementIdForLicense(licenseData: LicenseData): string {
        return licenseData.appEntitlementNumber || licenseData.licenseId;
    }

    public async getLicenseForEntitlementId(entitlementId: string): Promise<License | null> {
        return await this.licenseRepo.findOne({ where: { entitlementId } });
    }

    public async loadLicenseForTransaction(transaction: Transaction): Promise<License | null> {
        return await this.licenseRepo
            .findOne({
                where: { entitlementId: transaction.entitlementId }
            });
    }

    public async getLicenseHighestVersion(license: License) : Promise<number> {
        const queryBuilder = this.licenseVersionRepo.createQueryBuilder('license_version');
        queryBuilder.select('MAX(license_version.version)', 'maxVersion');
        queryBuilder.where('license_version.license_id = :licenseId', { licenseId: license.id });

        const result = await queryBuilder.getRawOne();
        const maxVersion = result?.maxVersion;
        return maxVersion ?? 0;
    }

    public async saveLicenseVersions(...versions: LicenseVersion[]) : Promise<void> {
        await this.licenseVersionRepo.save(versions);
    }

    public async saveLicense(license: License) : Promise<void> {
        await this.licenseRepo.save(license);
    }
}