import { inject, injectable } from 'inversify';
import { TYPES } from '#server/config/types';
import { TransactionDao } from '#server/database/dao/TransactionDao';
import { AddonDao } from '#server/database/dao/AddonDao';
import { PricingService } from '#server/services/PricingService';
import { PriceCalculatorService } from '#server/services/PriceCalculatorService';
import { TransactionValidationService } from '#server/services/transactionValidation/TransactionValidationService';
import { Transaction } from '#common/entities/Transaction';
import { TransactionMonthlyApportionmentEntry } from '#common/types/transactionPricing';
import {
    MonthlyAggregateApportionmentEntry,
    MonthlyAggregateApportionmentResponse
} from '#common/types/apportionment';
import { parsePurchaseMonth } from '#common/util/purchaseMonthUtils';
import { buildYearlyApportionmentFromMonths } from '#common/util/apportionmentAggregation';
import { rebindApportionmentBeforeSaleMonth } from '#common/util/apportionmentSaleMonthRebinding';

@injectable()
export class ApportionmentService {
    constructor(
        @inject(TYPES.TransactionDao) private transactionDao: TransactionDao,
        @inject(TYPES.AddonDao) private addonDao: AddonDao,
        @inject(TYPES.PricingService) private pricingService: PricingService,
        @inject(TYPES.TransactionValidationService) private transactionValidationService: TransactionValidationService,
        @inject(TYPES.PriceCalculatorService) private priceCalculatorService: PriceCalculatorService
    ) {}

    public async calculateApportionmentForTransaction(
        transaction: Transaction
    ): Promise<TransactionMonthlyApportionmentEntry[] | null> {
        let pricing;
        try {
            pricing = await this.pricingService.getPricingForTransaction(transaction);
        } catch {
            return null;
        }

        if (!pricing) {
            return null;
        }

        const validationResult = await this.transactionValidationService.validateTransaction({ transaction, pricing });
        if (!validationResult) {
            return null;
        }

        const months = this.priceCalculatorService.calculateMonthlyPriceApportionment({
            pricingOpts: validationResult.pricingOpts,
            expectedVendorAmount: validationResult.expectedVendorAmount,
            actualVendorAmount: transaction.data.purchaseDetails.vendorAmount
        });

        return rebindApportionmentBeforeSaleMonth(
            months,
            transaction.data.purchaseDetails.saleDate
        );
    }

    public async calculateAggregateApportionment(purchaseMonth: string): Promise<MonthlyAggregateApportionmentResponse> {
        const { startDate, endDate } = parsePurchaseMonth(purchaseMonth);
        const transactions = await this.transactionDao.getTransactionsBySaleMonth(startDate, endDate);

        const monthAggregates = new Map<string, MonthlyAggregateApportionmentEntry>();

        for (const transaction of transactions) {
            const apportionment = await this.calculateApportionmentForTransaction(transaction);
            if (!apportionment) {
                continue;
            }

            const { addonKey } = transaction.data;
            const { hosting } = transaction.data.purchaseDetails;

            for (const entry of apportionment) {
                if (entry.actualValue === 0) {
                    continue;
                }

                let aggregate = monthAggregates.get(entry.month);
                if (!aggregate) {
                    aggregate = { month: entry.month, actualValue: 0, transactions: [] };
                    monthAggregates.set(entry.month, aggregate);
                }

                aggregate.actualValue += entry.actualValue;
                aggregate.transactions.push({
                    transactionId: transaction.id,
                    transactionVersion: transaction.currentVersion,
                    actualAmount: entry.actualValue,
                    addonKey,
                    hosting
                });
            }
        }

        const months = [...monthAggregates.values()]
            .sort((a, b) => a.month.localeCompare(b.month))
            .map(entry => ({
                ...entry,
                actualValue: Math.round(entry.actualValue * 100) / 100
            }));

        const { years, byAddon } = buildYearlyApportionmentFromMonths(months);
        const addonMap = new Map((await this.addonDao.getAddons()).map(addon => [addon.addonKey, addon.name]));
        const byAddonWithNames = byAddon.map(entry => ({
            ...entry,
            addonName: addonMap.get(entry.addonKey) || undefined
        }));

        return { purchaseMonth, years, byAddon: byAddonWithNames, months };
    }
}
