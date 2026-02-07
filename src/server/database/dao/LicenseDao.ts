import { DataSource, In, Repository } from "typeorm";
import { License } from "#common/entities/License";
import { Transaction } from "#common/entities/Transaction";
import { inject, injectable } from "inversify";
import { TYPES } from "../../config/types";
import { LicenseData } from "#common/types/marketplace";
import { LicenseQueryParams, LicenseQueryResult, LicenseQuerySortType } from "#common/types/apiTypes";
import { RawSqlResultsToEntityTransformer } from "typeorm/query-builder/transformer/RawSqlResultsToEntityTransformer";
import { LicenseResult } from "#common/types/apiTypes";


@injectable()
export class LicenseDao {
    private licenseRepo: Repository<License>;
    private dataSource: DataSource;

    private readonly sortFieldMap: Record<LicenseQuerySortType, string[]> = {
        [LicenseQuerySortType.CreatedAt]: ['license.createdAt'],
        [LicenseQuerySortType.UpdatedAt]: ['license.updatedAt'],
        [LicenseQuerySortType.MaintenanceStartDate]: ["license.data->>'maintenanceStartDate'", 'license.createdAt'],
        [LicenseQuerySortType.MaintenanceEndDate]: ["license.data->>'maintenanceEndDate'", 'license.createdAt'],
        [LicenseQuerySortType.VersionCount]: [ 'version_count.version_count', 'license.createdAt' ],
        [LicenseQuerySortType.AtlassianLastUpdated]: ["license.data->>'lastUpdated'", 'license.createdAt'],
        [LicenseQuerySortType.GracePeriod]: ["coalesce(license.data->>'inGracePeriod', 'No')", 'license.createdAt'],
        [LicenseQuerySortType.MaintenanceDays]: ["(to_date(license.data->>'maintenanceEndDate','YYYY-mm-dd') - to_date(license.data->>'maintenanceStartDate','YYYY-mm-dd'))", 'license.createdAt']
    };

    constructor(@inject(TYPES.DataSource) dataSource: DataSource) {
        this.licenseRepo = dataSource.getRepository(License);
        this.dataSource = dataSource;
    }

    public getEntitlementIdForLicense(licenseData: LicenseData): string {
        const { appEntitlementNumber, licenseId, addonLicenseId } = licenseData;

        if (appEntitlementNumber || licenseId || addonLicenseId) {
            return appEntitlementNumber || licenseId || `SEN-${addonLicenseId}`;
        }

        throw new Error(`No entitlement ID found for license for app ${licenseData.addonName} with start date ${licenseData.maintenanceStartDate} for company ${licenseData.contactDetails?.company}`);
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

    public async saveLicense(license: License) : Promise<void> {
        await this.licenseRepo.save(license);
    }

    private escapeDoubleQuotes(str: string): string {
        return str.replace(/"/g, '\\"');
    }

    async getLicenses(params: LicenseQueryParams): Promise<LicenseQueryResult> {
        const {
            start = 0,
            limit = 25,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
            search,
            hosting,
            status,
            addonKey,
            licenseType
        } = params;

        try {
            const queryBuilder = this.licenseRepo.createQueryBuilder('license');

            // Add CTE for version counts
            queryBuilder.addCommonTableExpression(`
                SELECT license_version.license_id as lid, count(id) as version_count
                FROM license_version
                GROUP BY license_version.license_id`,
                'version_count'
            );

            // Select all license fields and the version count
            queryBuilder.addSelect('COALESCE(version_count.version_count, 0)', 'license_versionCount');
            queryBuilder.addSelect('dl.entitlement_id', 'license_dualLicensing');

            // Join with the version count CTE
            queryBuilder.leftJoin('version_count', 'version_count', 'version_count.lid = license.id');

            // select distinct entitlement_id from transaction t where
            // Add a left join with a subquery here:
            queryBuilder.leftJoin(
                (subQuery) => subQuery
                    .select('transaction.entitlementId', 'entitlement_id')
                    .from('transaction', 'transaction')
                    .where('jsonb_path_exists(transaction.data, \'$.purchaseDetails.discounts[*].reason ? (@ == "DUAL_LICENSING")\')'),
                'dl',
                'dl.entitlement_id = license.entitlementId'
            );

            if (search) {
                // Inspiration: https://stackoverflow.com/a/45849743/2220556
                queryBuilder.where(
                    'jsonb_path_exists(license.data, format(\'$.** ? (@.type() == "string" && @ like_regex %s flag "qi")\', :search::text)::jsonpath)',
                    { search: `"${this.escapeDoubleQuotes(search)}"` }
                );
            }

            if (hosting) {
                queryBuilder.andWhere('license.data->>\'hosting\' = :hosting', { hosting });
            }

            if (status) {
                queryBuilder.andWhere('license.data->>\'status\' = :status', { status });
            }

            if (addonKey) {
                queryBuilder.andWhere('license.data->>\'addonKey\' = :addonKey', { addonKey });
            }

            if (licenseType) {
                queryBuilder.andWhere('license.data->>\'licenseType\' IN (:...licenseType)', { licenseType });
            }

            // Apply sorting using the sort field map
            const orderByField = this.sortFieldMap[sortBy as LicenseQuerySortType];
            if (!orderByField) {
                throw new Error(`Invalid sortBy: ${sortBy}`);
            }

            orderByField.forEach(field => queryBuilder.addOrderBy(field, sortOrder));

            const total = await queryBuilder.getCount();

            queryBuilder.offset(start).limit(limit);

            const rawResults = await queryBuilder.getRawMany();

            const transformer = new RawSqlResultsToEntityTransformer(
                queryBuilder.expressionMap,
                this.dataSource.driver,
                [],
                []
            );
            const licenses = transformer.transform(rawResults, queryBuilder.expressionMap.mainAlias!);

            const licenseResults = licenses.map((license, index) => {
                const versionCount = parseInt(rawResults[index].license_versionCount) || 0;

                return {
                    license,
                    versionCount,
                    dualLicensing: rawResults[index].license_dualLicensing ? true : false
                } as LicenseResult;
            });

            return {
                licenses: licenseResults,
                total,
                count: licenseResults.length
            };
        } catch (error: any) {
            throw error;
        }
    }
}