import { LicenseVersion } from "#common/entities/LicenseVersion";
import { License } from "#common/entities/License";
import { TYPES } from "#server/config/types";
import { inject, injectable } from "inversify";
import { DataSource, Repository } from "typeorm";
import { isUUID } from "validator";

@injectable()
export class LicenseVersionDao {
    private licenseVersionRepo: Repository<LicenseVersion>;

    constructor(@inject(TYPES.DataSource) dataSource: DataSource) {
        this.licenseVersionRepo = dataSource.getRepository(LicenseVersion);
    }

    public async getLicenseVersions(licenseId: string): Promise<LicenseVersion[]> {
        if (!isUUID(licenseId)) {
            throw new Error('Invalid license ID: must be a valid UUID');
        }

        return await this.licenseVersionRepo.find({
            where: { license: { id: licenseId } },
            order: { version: 'DESC' }
        });
    }

    public async getLicenseVersionByNumber(opts: { licenseId: string, version: number }): Promise<LicenseVersion | null> {
        const { licenseId, version } = opts;

        if (!isUUID(opts.licenseId)) {
            throw new Error('Invalid license ID: must be a valid UUID');
        }

        return await this.licenseVersionRepo.findOne({
            where: { license: { id: licenseId }, version }
        });
    }

    public async getLicenseHighestVersion(license: License): Promise<number> {
        const queryBuilder = this.licenseVersionRepo.createQueryBuilder('license_version');
        queryBuilder.select('MAX(license_version.version)', 'maxVersion');
        queryBuilder.where('license_version.license_id = :licenseId', { licenseId: license.id });

        const result = await queryBuilder.getRawOne();
        const maxVersion = result?.maxVersion;
        return maxVersion ?? 0;
    }

    public async saveLicenseVersions(...versions: LicenseVersion[]): Promise<void> {
        await this.licenseVersionRepo.save(versions);
    }
}