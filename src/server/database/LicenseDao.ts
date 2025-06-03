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

    public async getCurrentLicenseVersionForLicense(license: License): Promise<LicenseVersion | null> {
        return await this.licenseVersionRepo.findOne({
            where: { license },
            order: { createdAt: 'DESC' },
            relations: ['nextLicenseVersion', 'priorLicenseVersion']
        });
    }

    public async saveLicenseVersions(...versions: LicenseVersion[]) : Promise<void> {
        await this.licenseVersionRepo.save(versions);
    }

    public async saveLicense(license: License) : Promise<void> {
        await this.licenseRepo.save(license);
    }
}