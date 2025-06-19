import { TransactionData, TransactionDiscountType } from "#common/types/marketplace";

export const calculateDiscountForTransaction = (opts: { data: TransactionData; type?: TransactionDiscountType; }) => {
    const { data, type } = opts;

    return data.purchaseDetails.discounts?.reduce((acc, discount) =>
        acc + ((!type || discount.type === type) ? discount.amount : 0),
        0) ?? 0;
};
