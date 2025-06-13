import { Transaction } from '#common/entities/Transaction';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../config/types';
import { formatCurrency } from '#common/util/formatCurrency';
import { dateDiff } from '#common/util/dateUtils';
import { Pricing } from '#common/entities/Pricing';
import { TransactionValidationResult, DiscountResult, ValidationOptions, PriceWithPricingOpts } from './types';
import { EXPECTED_DISCOUNT_PERMUTATIONS_WITH_ACTUAL_ADJUSTMENTS, EXPECTED_DISCOUNT_PERMUTATIONS_WITH_ESTIMATED_ADJUSTMENTS, LEGACY_PRICING_PERMUTATIONS_NO_UPGRADE, LEGACY_PRICING_PERMUTATIONS_WITH_UPGRADE, PARTNER_DISCOUNT_PERMUTATIONS_FOR_CLOUD, PARTNER_DISCOUNT_PERMUTATIONS_FOR_DATACENTER, PARTNER_DISCOUNT_PERMUTATIONS_FOR_OPT_OUT } from './pricingPermutations';
import { TransactionSandboxService } from './TransactionSandboxService';
import { TransactionAdjustmentValidationService } from './TransactionAdjustmentValidationService';
import { TransactionValidator } from './TransactionValidator';
import { ALERT_DAYS_AFTER_PRICING_CHANGE } from './constants';
import { PreviousTransactionService } from '../PreviousTransactionService';
import { PreviousTransactionResult } from '#server/services/types';

@injectable()
export class TransactionValidationService {
    constructor(
        @inject(TYPES.TransactionSandboxService) private transactionSandboxService: TransactionSandboxService,
        @inject(TYPES.TransactionAdjustmentValidationService) private transactionAdjustmentValidationService: TransactionAdjustmentValidationService,
        @inject(TYPES.TransactionValidator) private transactionValidator: TransactionValidator,
        @inject(TYPES.PreviousTransactionService) private previousTransactionService: PreviousTransactionService
    ) {
    }

    public async validateTransaction(opts: { transaction: Transaction; pricing: Pricing; }) : Promise<TransactionValidationResult|undefined> {
        const { transaction, pricing } = opts;
        const discountResult = await this.transactionAdjustmentValidationService.calculateFinalExpectedDiscountForTransaction(transaction);
        const isSandbox = await this.transactionSandboxService.isTransactionForSandbox(transaction);
        const validationResult = await this.validateOneTransactionWithPricingPermutations({ transaction, discountResult, isSandbox, pricing });
        return this.applyPostValidationRules({ transaction, validationResult });
    }

    /**
     * Attempt to validate the price for a transaction.
     *
     * For a given transaction, we do not know if it was sold with legacy pricing or not, and same for the
     * transaction from which it was being upgraded (which also impacts the current transaction's sales price).
     * To account for these scenarios, we try all possible permutations of legacy pricing (or not) for both
     * transactions. Additionally, the transaction may have been sold with or without a promo code, and
     * with or without solutions partner discounts, so we try those permutations as well.
     */
    private async validateOneTransactionWithPricingPermutations(opts: { transaction: Transaction; discountResult: DiscountResult; isSandbox: boolean; pricing: Pricing; }) : Promise<TransactionValidationResult|undefined> {
        const { transaction, discountResult, isSandbox, pricing } = opts;
        const { discountToUse } = discountResult;

        let validationResult : TransactionValidationResult|undefined = undefined;

        const legacyPricePermutations = transaction.data.purchaseDetails.saleType === 'Upgrade'
                                            ? LEGACY_PRICING_PERMUTATIONS_WITH_UPGRADE
                                            : LEGACY_PRICING_PERMUTATIONS_NO_UPGRADE;

        const partnerDiscountFractionPermutations = pricing.expertDiscountOptOut                           ? PARTNER_DISCOUNT_PERMUTATIONS_FOR_OPT_OUT
                                            : transaction.data.purchaseDetails.hosting === 'Cloud' ? PARTNER_DISCOUNT_PERMUTATIONS_FOR_CLOUD
                                                                                                   : PARTNER_DISCOUNT_PERMUTATIONS_FOR_DATACENTER;

        // But first, load details about the previous purchase (if any). We do this at the top level so we only need to do
        // it once (which is somewhat expensive), rather than for each permutation.

        const { saleType } = transaction.data.purchaseDetails;
        let previousPurchaseFindResult : PreviousTransactionResult|undefined = undefined;
        let expectedDiscountForPreviousPurchase : DiscountResult | undefined = undefined;

        if (saleType==='Upgrade' || saleType==='Renewal') {
            previousPurchaseFindResult = await this.previousTransactionService.findPreviousTransaction(transaction);

            if (previousPurchaseFindResult) {
                expectedDiscountForPreviousPurchase = await this.transactionAdjustmentValidationService.calculateFinalExpectedDiscountForTransaction(previousPurchaseFindResult.transaction);
            }
        }

        // For this transaction, try various permutations of legacy pricing (or not) for both
        // the main transaction, as well as the license we are upgrading from (if any).

        for (const legacyPricePermutation of legacyPricePermutations) {

            // Also try permutations of using or not using the expected discount, but only if a discount exists

            let discountPermutations : boolean[] = [ true ];

            if (discountToUse !== 0) {
                discountPermutations = discountResult.hasActualAdjustments
                    ? EXPECTED_DISCOUNT_PERMUTATIONS_WITH_ACTUAL_ADJUSTMENTS // if no match, still apply user-requested discounts in totals
                    : EXPECTED_DISCOUNT_PERMUTATIONS_WITH_ESTIMATED_ADJUSTMENTS; // if no match, remove estimated discounts from totals
            }

            for (const useExpectedDiscount of discountPermutations) {
                const { useLegacyPricingTierForCurrent, useLegacyPricingTierForPrevious } = legacyPricePermutation;
                const { hasActualAdjustments } = discountResult;

                for (const partnerDiscountFraction of partnerDiscountFractionPermutations) {

                    // Try to see if the price matches with this permutation of legacy pricing (or not)

                    validationResult = await this.transactionValidator.validateOneTransaction({
                        transaction,
                        useLegacyPricingTierForCurrent,
                        useLegacyPricingTierForPrevious,
                        expectedDiscount: useExpectedDiscount ? discountToUse : 0,
                        hasActualAdjustments,
                        partnerDiscountFraction,
                        isSandbox,
                        previousPurchaseFindResult,
                        expectedDiscountForPreviousPurchase
                    });

                    const { isExpectedPrice, notes } = validationResult;

                    if (isExpectedPrice) {
                        if (useLegacyPricingTierForCurrent) {
                            const { saleDate } = transaction.data.purchaseDetails;
                            const { legacyPricingEndDate } = validationResult;

                            notes.push(`Price is correct but uses legacy pricing for current transaction (sold on ${saleDate}, but prior pricing ended on ${legacyPricingEndDate})`);
                        }

                        if (useLegacyPricingTierForPrevious) {
                            notes.push(`Price is correct but uses legacy pricing for previous transaction`);
                        }

                        if (partnerDiscountFraction > 0) {
                            notes.push(`Price is correct but assumes Solutions Partner discount of ${partnerDiscountFraction*100}%`);
                        }

                        if (useExpectedDiscount) {
                            discountResult.adjustmentNotes.forEach(n => {
                                if (discountResult.hasActualAdjustments) {
                                    notes.push(`Reconciled using manual adjustment: ${n}`);
                                } else {
                                    // Otherwise, these are expected discounts, so just add the message directly.
                                    notes.push(n);
                                }
                            });
                        } else {
                            notes.push(`Price is correct but expected discount of ${formatCurrency(discountToUse)} was not applied`);
                        }
                    }

                    // Now return early if we find the expected price

                    if (isExpectedPrice) {
                        return validationResult;
                    }
                }
            }
        }

        // Otherwise, return the validation result with no legacy pricing but all adjustments applied
        return validationResult;
    }

    /**
     * Rules to apply after finding the final price.
     */
    public async applyPostValidationRules(opts: { transaction: Transaction; validationResult: TransactionValidationResult|undefined; }) : Promise<TransactionValidationResult|undefined> {
        const { transaction, validationResult } = opts;

        if (!validationResult) {
            return undefined;
        }

        const { useLegacyPricingTierForCurrent, legacyPricingEndDate } = validationResult;

        if (useLegacyPricingTierForCurrent && legacyPricingEndDate) {
            const days = dateDiff(legacyPricingEndDate, transaction.data.purchaseDetails.saleDate);

            // This test is not inlined with the main cehck for legacy pricing because we want to be able to sleuth out
            // the correct permutation of legacy/non-legacy and discount/no-discount pricing, but we still want to
            // alert if legacy pricing is still in force after the pricing change date.

            if (days > ALERT_DAYS_AFTER_PRICING_CHANGE) {
                validationResult.notes.push(`Legacy pricing was still applied more than ${ALERT_DAYS_AFTER_PRICING_CHANGE} days after pricing change on ${legacyPricingEndDate}`);
                validationResult.valid = false;
            }
        }

        return validationResult;
    }
}