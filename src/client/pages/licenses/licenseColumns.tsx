import { ColumnConfig } from '../../components/ColumnConfig';
import { LicenseQuerySortType } from '#common/types/apiTypes';
import { WrappedLabel } from '#client/components/styles.js';

export const defaultLicenseColumns: ColumnConfig[] = [
    {
        id: 'entitlementId',
        label: 'Entitlement ID',
        visible: true,
        sortable: false
    },
    {
        id: 'app',
        label: 'App',
        visible: true,
        sortable: false
    },
    {
        id: 'licenseType',
        label: 'License Type',
        visible: true,
        sortable: false
    },
    {
        id: 'status',
        label: 'Status',
        visible: true,
        sortable: false
    },
    {
        id: 'hosting',
        label: 'Hosting',
        visible: true,
        sortable: false
    },
    {
        id: 'tier',
        label: 'Tier',
        visible: true,
        sortable: false
    },
    {
        id: 'company',
        label: 'Company',
        visible: true,
        sortable: false
    },
    {
        id: 'maintenanceDays',
        label: <WrappedLabel>Maintenance<br/>Days</WrappedLabel>,
        visible: true,
        sortable: true,
        align: 'right',
        sortField: LicenseQuerySortType.MaintenanceDays
    },
    {
        id: 'maintenanceStartDate',
        label: <WrappedLabel>Maintenance<br/>Start</WrappedLabel>,
        visible: true,
        sortable: true,
        sortField: LicenseQuerySortType.MaintenanceStartDate
    },
    {
        id: 'maintenanceEndDate',
        label: <WrappedLabel>Maintenance<br/>End</WrappedLabel>,
        visible: true,
        sortable: true,
        sortField: LicenseQuerySortType.MaintenanceEndDate
    },
    {
        id: 'gracePeriod',
        label: <WrappedLabel>Grace<br/>Period</WrappedLabel>,
        visible: true,
        sortable: true,
        sortField: LicenseQuerySortType.GracePeriod
    },
    {
        id: 'createdAt',
        label: 'Created',
        visible: true,
        sortable: true,
        sortField: LicenseQuerySortType.CreatedAt,
        tooltip: 'The first time the license was downloaded to this app'
    },
    {
        id: 'updatedAt',
        label: 'Updated',
        visible: true,
        sortable: true,
        sortField: LicenseQuerySortType.UpdatedAt,
        tooltip: 'The last time a new version of this license was detected by this app'
    },
    {
        id: 'atlassianLastUpdated',
        label: <WrappedLabel>Atlassian<br/>Last Updated</WrappedLabel>,
        visible: true,
        sortable: true,
        sortField: LicenseQuerySortType.AtlassianLastUpdated,
        tooltip: 'The last time Atlassian claims the license was updated'
    },
    {
        id: 'versionCount',
        label: 'Versions',
        visible: true,
        sortable: true,
        sortField: LicenseQuerySortType.VersionCount,
        tooltip: 'The number of historical versions of this license that have been stored'
    }
];