import { ColumnConfig } from '../../components/ColumnConfig';
import { TransactionQuerySortType, TransactionResult } from '#common/types/apiTypes';
import { WrappedLabel } from '#client/components/styles';
import { formatCurrency } from '#common/util/formatCurrency';
import { isoStringWithOnlyDate } from '#common/util/dateUtils';
import { dateDiff } from '#common/util/dateUtils';
import { HighlightIfSignificantlyDifferent } from '../../components/HighlightIfSignificantlyDifferent';
import { sumDiscountArrayForTransaction } from '#common/util/transactionDiscounts.js';
import { TransactionDiscount } from '#common/types/marketplace';
import { EmphasizedAnnotation } from '../../components/styles';
import { mapDiscountTypeToDescription } from './util';
import { StatusCell, ReconciliationHeaderCell } from '../../components/styles';
import { ReconciliationControls } from './ReconciliationControls';

// Define the context type for transaction cell rendering
export interface TransactionCellContext {
    onQuickReconcile: (transaction: TransactionResult, reconciled: boolean) => Promise<void>;
    onShowDetails: (transaction: TransactionResult) => void;
}

// Helper function for discounts
const discountsToDescriptions = (discounts: TransactionDiscount[]|undefined) => {
    if (!discounts) return undefined;

    return (
        <EmphasizedAnnotation>
            {discounts.map(d => mapDiscountTypeToDescription(d)).join(', ')}
        </EmphasizedAnnotation>
    );
};

export const defaultTransactionColumns: ColumnConfig<TransactionResult, TransactionCellContext, TransactionQuerySortType>[] = [
    {
        id: 'saleDate',
        label: 'Sale Date',
        visible: true,
        sortField: TransactionQuerySortType.SaleDate,
        renderSimpleCell: (tr) => tr.transaction.data.purchaseDetails.saleDate
    },
    {
        id: 'entitlementId',
        label: 'Entitlement ID',
        visible: true,
        nowrap: true,
        renderSimpleCell: (tr) => tr.transaction.entitlementId
    },
    {
        id: 'invoiceNumber',
        label: 'Invoice #',
        visible: true,
        nowrap: true,
        renderSimpleCell: (tr) => tr.transaction.data.transactionId
    },
    {
        id: 'app',
        label: 'App',
        visible: true,
        renderSimpleCell: (tr) => tr.transaction.data.addonName
    },
    {
        id: 'saleType',
        label: 'Sale Type',
        visible: true,
        renderSimpleCell: (tr) => tr.transaction.data.purchaseDetails.saleType
    },
    {
        id: 'hosting',
        label: 'Hosting',
        visible: true,
        renderSimpleCell: (tr) => tr.transaction.data.purchaseDetails.hosting
    },
    {
        id: 'tier',
        label: 'Tier',
        visible: true,
        renderSimpleCell: (tr) => (
            <>
                {tr.transaction.data.purchaseDetails.tier}
                {tr.isSandbox && <EmphasizedAnnotation>Sandbox</EmphasizedAnnotation>}
                {tr.transaction.data.purchaseDetails.discounts?.some(d => d.type==='MANUAL' && d.reason==='DUAL_LICENSING') && <EmphasizedAnnotation>Dual Licensing</EmphasizedAnnotation>}
            </>
        )
    },
    {
        id: 'company',
        label: 'Company',
        visible: true,
        renderSimpleCell: (tr) => (
            <>
                {tr.transaction.data.customerDetails.company}
                {tr.isSandbox && tr.cloudSiteHostname && <EmphasizedAnnotation>({tr.cloudSiteHostname})</EmphasizedAnnotation>}
            </>
        )
    },
    {
        id: 'amount',
        label: 'Amount',
        visible: true,
        align: 'right',
        sortField: TransactionQuerySortType.VendorAmount,
        renderSimpleCell: (tr) => formatCurrency(tr.transaction.data.purchaseDetails.vendorAmount)
    },
    {
        id: 'expectedAmount',
        label: 'Expected Amount',
        visible: true,
        align: 'right',
        renderSimpleCell: (tr) => (
            <HighlightIfSignificantlyDifferent value={tr.transaction.reconcile?.expectedVendorAmount} compareToValue={tr.transaction.data.purchaseDetails.vendorAmount}/>
        )
    },
    {
        id: 'discounts',
        label: 'Discounts',
        visible: true,
        align: 'right',
        sortField: TransactionQuerySortType.Discounts,
        renderSimpleCell: (tr) => (
            <>
                {formatCurrency(sumDiscountArrayForTransaction({ data: tr.transaction.data }))}
                {discountsToDescriptions(tr.transaction.data.purchaseDetails.discounts)}
            </>
        )
    },
    {
        id: 'maintenanceDays',
        label: <WrappedLabel>Maintenance<br/>Days</WrappedLabel>,
        visible: true,
        align: 'right',
        sortField: TransactionQuerySortType.MaintenanceDays,
        renderSimpleCell: (tr) => `${dateDiff(tr.transaction.data.purchaseDetails.maintenanceStartDate, tr.transaction.data.purchaseDetails.maintenanceEndDate)} days`
    },
    {
        id: 'maintenancePeriod',
        label: 'Maintenance Period',
        visible: true,
        renderSimpleCell: (tr) => isoStringWithOnlyDate(tr.transaction.data.purchaseDetails.maintenanceStartDate) + ' - ' + isoStringWithOnlyDate(tr.transaction.data.purchaseDetails.maintenanceEndDate)
    },
    {
        id: 'createdAt',
        label: 'Created',
        visible: true,
        sortField: TransactionQuerySortType.CreatedAt,
        tooltip: 'The first time the transaction was downloaded to this app',
        renderSimpleCell: (tr) => isoStringWithOnlyDate(tr.transaction.createdAt.toString())
    },
    {
        id: 'updatedAt',
        label: 'Updated',
        visible: true,
        sortField: TransactionQuerySortType.UpdatedAt,
        tooltip: 'The last time a new version of this transaction was detected by this app',
        renderSimpleCell: (tr) => isoStringWithOnlyDate(tr.transaction.updatedAt.toString())
    },
    {
        id: 'versionCount',
        label: 'Versions',
        visible: true,
        sortField: TransactionQuerySortType.VersionCount,
        tooltip: 'The number of historical versions of this transaction that have been stored',
        renderSimpleCell: (tr) => tr.versionCount
    },
    {
        id: 'paymentStatus',
        label: 'Payment Status',
        visible: true,
        renderSimpleCell: (tr) => tr.transaction.data.paymentStatus
    },
    {
        id: 'reconciliation',
        label: 'Reconciliation',
        visible: true,
        renderFullHeader: () => <ReconciliationHeaderCell key="reconciliation"></ReconciliationHeaderCell>,
        renderFullCell: (tr, context) => (
            <StatusCell key="reconciliation" onClick={(e) => e.stopPropagation()}>
                <ReconciliationControls
                    transaction={tr}
                    onQuickReconcile={context.onQuickReconcile}
                    onShowDetails={context.onShowDetails}
                />
            </StatusCell>
        )
    }
];