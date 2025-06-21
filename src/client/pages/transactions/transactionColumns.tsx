import { ColumnConfig } from '../../components/ColumnConfig';
import { TransactionQuerySortType } from '#common/types/apiTypes';
import { WrappedLabel } from '#client/components/styles';

export const defaultTransactionColumns: ColumnConfig[] = [
    {
        id: 'saleDate',
        label: 'Sale Date',
        visible: true,
        sortable: true,
        sortField: TransactionQuerySortType.SaleDate
    },
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
        id: 'saleType',
        label: 'Sale Type',
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
        id: 'amount',
        label: 'Amount',
        visible: true,
        sortable: true,
        align: 'right',
        sortField: TransactionQuerySortType.VendorAmount
    },
    {
        id: 'expectedAmount',
        label: 'Expected Amount',
        visible: true,
        sortable: false,
        align: 'right'
    },
    {
        id: 'discounts',
        label: 'Discounts',
        visible: true,
        sortable: true,
        align: 'right',
        sortField: TransactionQuerySortType.Discounts
    },
    {
        id: 'maintenanceDays',
        label: <WrappedLabel>Maintenance<br/>Days</WrappedLabel>,
        visible: true,
        sortable: true,
        align: 'right',
        sortField: TransactionQuerySortType.MaintenanceDays
    },
    {
        id: 'maintenancePeriod',
        label: 'Maintenance Period',
        visible: true,
        sortable: false
    },
    {
        id: 'createdAt',
        label: 'Created',
        visible: true,
        sortable: true,
        sortField: TransactionQuerySortType.CreatedAt,
        tooltip: 'The first time the transaction was downloaded to this app'
    },
    {
        id: 'updatedAt',
        label: 'Updated',
        visible: true,
        sortable: true,
        sortField: TransactionQuerySortType.UpdatedAt,
        tooltip: 'The last time a new version of this transaction was detected by this app'
    },
    {
        id: 'versionCount',
        label: 'Versions',
        visible: true,
        sortable: true,
        sortField: TransactionQuerySortType.VersionCount,
        tooltip: 'The number of historical versions of this transaction that have been stored'
    },
    {
        id: 'reconciliation',
        label: 'Reconciliation',
        visible: true,
        sortable: false
    }
];