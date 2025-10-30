import { ColumnConfig } from '../../components/ColumnConfig';
import { LicenseQuerySortType, LicenseResult } from '#common/types/apiTypes';
import { WrappedLabel } from '#client/components/styles.js';
import { isoStringWithOnlyDate } from '#common/util/dateUtils';
import { dateDiff } from '#common/util/dateUtils';
import { EmphasizedAnnotation } from '../../components/styles';

// Define the context type for license cell rendering (currently no context needed)
export interface LicenseCellContext {
    // No context needed for licenses currently
}

// Helper function for toMixedCase
const toMixedCase = (str: string) => {
    return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
};

// Maintenance is considered active when maintenanceEndDate is today or later
const isMaintenanceActive = (maintenanceEndDate?: string | null): boolean => {
    if (!maintenanceEndDate) return false;
    const end = new Date(maintenanceEndDate);
    if (isNaN(end.getTime())) return false;
    const now = new Date();
    return end >= now;
};

export const defaultLicenseColumns: ColumnConfig<LicenseResult, LicenseCellContext, LicenseQuerySortType>[] = [
    {
        id: 'entitlementId',
        label: 'Entitlement ID',
        visible: true,
        nowrap: true,
        renderSimpleCell: (lr) => lr.license.entitlementId
    },
    {
        id: 'app',
        label: 'App',
        visible: true,
        renderSimpleCell: (lr) => lr.license.data.addonName
    },
    {
        id: 'licenseType',
        label: 'License Type',
        visible: true,
        renderSimpleCell: (lr) => (
            <>
                {toMixedCase(lr.license.data.licenseType)}
                {lr.license.data.installedOnSandbox === 'Yes' && <EmphasizedAnnotation>(Sandbox)</EmphasizedAnnotation>}
                {lr.dualLicensing && <EmphasizedAnnotation>(Dual Licensing)</EmphasizedAnnotation>}
            </>
        )
    },
    {
        id: 'status',
        label: 'Status',
        visible: true,
        renderSimpleCell: (lr) => toMixedCase(lr.license.data.status)
    },
    {
        id: 'hosting',
        label: 'Hosting',
        visible: true,
        renderSimpleCell: (lr) => lr.license.data.hosting
    },
    {
        id: 'tier',
        label: 'Tier',
        visible: true,
        renderSimpleCell: (lr) =>
            lr.license.data.tier + (lr.license.data.tier === 'Evaluation' && lr.license.data.evaluationOpportunitySize && lr.license.data.evaluationOpportunitySize !== 'Evaluation' ? ` (${lr.license.data.evaluationOpportunitySize})` : '')
    },
    {
        id: 'company',
        label: 'Company',
        visible: true,
        renderSimpleCell: (lr) => {
            let result = lr.license.data.contactDetails.company;

            if (lr.license.data.hosting==='Cloud') {
                const email = lr.license.data.contactDetails.technicalContact?.email;
                if (email && email.includes('@')) {
                    // strip everything before the @
                    result  += ` (@${email.split('@')[1]})`;
                }
            }

            return result;
        }
    },
    {
        id: 'maintenanceDays',
        label: <WrappedLabel>Maintenance<br/>Days</WrappedLabel>,
        visible: true,
        align: 'right',
        sortField: LicenseQuerySortType.MaintenanceDays,
        renderSimpleCell: (lr) =>
            lr.license.data.maintenanceEndDate ? `${dateDiff(lr.license.data.maintenanceStartDate, lr.license.data.maintenanceEndDate)} days` : '? days'
    },
    {
        id: 'maintenanceStartDate',
        label: <WrappedLabel>Maintenance<br/>Start</WrappedLabel>,
        visible: true,
        nowrap: true,
        sortField: LicenseQuerySortType.MaintenanceStartDate,
        renderSimpleCell: (lr) => {
            const active = isMaintenanceActive(lr.license.data.maintenanceEndDate);
            const value = lr.license.data.maintenanceStartDate ?? '';
            return <span style={{ color: active ? 'green' : 'red' }}>{value}</span>;
        }
    },
    {
        id: 'maintenanceEndDate',
        label: <WrappedLabel>Maintenance<br/>End</WrappedLabel>,
        visible: true,
        nowrap: true,
        sortField: LicenseQuerySortType.MaintenanceEndDate,
        renderSimpleCell: (lr) => {
            const active = isMaintenanceActive(lr.license.data.maintenanceEndDate);
            const value = lr.license.data.maintenanceEndDate ?? '';
            return <span style={{ color: active ? 'green' : 'red' }}>{value}</span>;
        }
    },
    {
        id: 'gracePeriod',
        label: <WrappedLabel>Grace<br/>Period</WrappedLabel>,
        visible: true,
        nowrap: true,
        sortField: LicenseQuerySortType.GracePeriod,
        renderSimpleCell: (lr) => lr.license.data.inGracePeriod ?? 'No'
    },
    {
        id: 'createdAt',
        label: 'Created',
        visible: true,
        nowrap: true,
        sortField: LicenseQuerySortType.CreatedAt,
        tooltip: 'The first time the license was downloaded to this app',
        renderSimpleCell: (lr) => isoStringWithOnlyDate(lr.license.createdAt.toString())
    },
    {
        id: 'updatedAt',
        label: 'Updated',
        visible: true,
        nowrap: true,
        sortField: LicenseQuerySortType.UpdatedAt,
        tooltip: 'The last time a new version of this license was detected by this app',
        renderSimpleCell: (lr) => isoStringWithOnlyDate(lr.license.updatedAt.toString())
    },
    {
        id: 'atlassianLastUpdated',
        label: <WrappedLabel>Atlassian<br/>Last Updated</WrappedLabel>,
        visible: true,
        nowrap: true,
        sortField: LicenseQuerySortType.AtlassianLastUpdated,
        tooltip: 'The last time Atlassian claims the license was updated',
        renderSimpleCell: (lr) => isoStringWithOnlyDate(lr.license.data.lastUpdated)
    },
    {
        id: 'versionCount',
        label: 'Versions',
        visible: true,
        sortField: LicenseQuerySortType.VersionCount,
        tooltip: 'The number of historical versions of this license that have been stored',
        renderSimpleCell: (lr) => lr.versionCount
    }
];