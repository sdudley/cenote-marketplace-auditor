import { inject, injectable } from "inversify";

import { Transaction } from "#common/entities/Transaction";
import { TransactionAdjustment } from "#common/entities/TransactionAdjustment";
import { formatCurrency } from "#common/util/formatCurrency";
import { DiscountResult } from "./types";
import { TYPES } from "#server/config/types";
import { ResellerDao } from "#server/database/dao/ResellerDao";
import { TransactionAdjustmentDao } from "#server/database/dao/TransactionAdjustmentDao";

@injectable()
export class TransactionAdjustmentValidationService {
    constructor(
        @inject(TYPES.ResellerDao) private resellerDao: ResellerDao,
        @inject(TYPES.TransactionAdjustmentDao) private transactionAdjustmentDao: TransactionAdjustmentDao,
    ) {}

    /**
     * If we have a defined set of resellers with individual discounts, generate the expected adjustments that
     * correspond to their discount.
     */
    private async generateExpectedAdjustmentsForPromoCodes(transaction: Transaction) : Promise<TransactionAdjustment[]> {
        const resellerName = transaction.data.partnerDetails?.partnerName;
        const reseller = await this.resellerDao.findMatchingReseller(resellerName);

        if (!reseller) {
            return [];
        }

        const { discountAmount } = reseller;

        if (discountAmount > 1) {
            throw new Error(`Reseller discount amount cannot be greater than 100%: ${discountAmount} for ${resellerName}`);
        }

        if (discountAmount <= 0) {
            return [];
        }

        const { purchasePrice } = transaction.data.purchaseDetails

        if (purchasePrice===0) {
            return [];
        }

        // Reseller discount is a percentage expressed as 0.05 = 5%
        //
        // The discount has already been applied to the purchase price, so we need to reverse it
        // to get the original purchase price.

        let purchasePriceDiscount = (purchasePrice / (1-discountAmount)) - purchasePrice;

        // Discount is always positive, even for refunds

        if (purchasePriceDiscount < 0) {
            purchasePriceDiscount = -purchasePriceDiscount;
        }

        const adjustment = new TransactionAdjustment();
        adjustment.transaction = transaction;
        adjustment.purchasePriceDiscount = purchasePriceDiscount;
        adjustment.notes = `Automatic reseller discount of ${discountAmount*100}% (${formatCurrency(purchasePriceDiscount)}) for ${resellerName}`;

        return [adjustment];
    }

    /**
     * Get the set of expected discounts to be applied to the transaction, which consist
     * of automatically-calculated discounts for specific resellers, plus actual
     * adjustments that have been manually applied to the database.
     *
     * If we have actual adjustments in the database, these override any expected
     * discounts we have calculated and we use only the actual adjustments instead.
     */
    public async calculateFinalExpectedDiscountForTransaction(transaction: Transaction) : Promise<DiscountResult> {
        // Check to see if we expect any reseller adjustments for this transaction

        const expectedAdjustments = await this.generateExpectedAdjustmentsForPromoCodes(transaction);
        const actualAdjustments = await this.transactionAdjustmentDao.getAdjustmentsForTransaction(transaction);

        // If any adjustments were actually persisted to the database, use those. If not,
        // generate the adjustments we expect (such as reseller discounts).

        const shouldApplyActualAdjustments = actualAdjustments.length > 0;
        const adjustmentsToApply = shouldApplyActualAdjustments ? actualAdjustments : expectedAdjustments;
        const discountToUse = adjustmentsToApply.reduce((acc, adjustment) => acc + (adjustment.purchasePriceDiscount || 0), 0);
        const hasActualAdjustments = actualAdjustments.length > 0;

        return {
            discountToUse,
            hasExpectedAdjustments: expectedAdjustments.length > 0,
            hasActualAdjustments,
            adjustmentNotes: adjustmentsToApply
                .map(a => hasActualAdjustments ? `${formatCurrency(a.purchasePriceDiscount)} (${a.notes})` : a.notes)
                .filter((n): n is string => typeof n === 'string')
        };
    }
}