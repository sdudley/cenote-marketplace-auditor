import { TransactionData, TransactionDiscount } from '#common/types/marketplace';

export const handleExportTransaction = (opts: { transactionData: TransactionData; suffix?: string }): void => {
    const { transactionData, suffix } = opts;
    const fileName = `${transactionData.transactionId || 'transaction'}${suffix ? `-${suffix}` : ''}.json`;

    // Create a blob with the JSON data
    const blob = new Blob([JSON.stringify(transactionData, null, 2)], {
        type: 'application/json'
    });

    // Create a download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;

    // Trigger the download
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};


export const mapDiscountTypeToDescription = (d: TransactionDiscount) : string => {
    const { type, reason } = d;

    switch (type) {
        case 'MANUAL':
            return (reason==='DUAL_LICENSING') ? 'Dual Licensing' : 'Manual';
        case 'MARKETPLACE_PROMOTION':
            return 'PromoCode';
        case 'LOYALTY_DISCOUNT':
            return 'Loyalty';
        case 'EXPERT':
            return 'SolPartnr';
        default:
            return 'Unknown';
    }
};