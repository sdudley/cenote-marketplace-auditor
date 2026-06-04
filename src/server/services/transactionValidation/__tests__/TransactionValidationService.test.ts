import { TransactionValidationService } from '../TransactionValidationService.js';
import { DiscountResult, TransactionValidationResult } from '../types.js';
import { PreviousTransactionResult } from '#server/services/types.js';

const makeDiscountResult = (): DiscountResult => ({
    discountToUse: 0,
    hasExpectedAdjustments: false,
    hasActualAdjustments: false,
    adjustmentNotes: []
});

const makeValidationResult = (): TransactionValidationResult => ({
    isExpectedPrice: true,
    valid: true,
    vendorAmount: 10,
    expectedVendorAmount: 10,
    expectedDiscountApplied: 0,
    notes: [],
    price: {
        vendorPrice: 10,
        purchasePrice: 12.5,
        dailyNominalPrice: 1,
        descriptors: []
    },
    pricingOpts: {} as any,
    legacyPricingEndDate: undefined,
    previousPurchaseLegacyPricingEndDate: undefined,
    useLegacyPricingTierForCurrent: false,
    hasActualAdjustments: false
});

const makeTransaction = (saleDate: string, saleType: 'Refund' | 'Upgrade' | 'New' = 'Refund'): any => ({
    data: {
        customerDetails: {
            country: 'United States'
        },
        purchaseDetails: {
            saleDate,
            saleType,
            hosting: 'Cloud',
            tier: 'Per Unit Pricing (173 Users)',
            maintenanceStartDate: '2026-05-01',
            maintenanceEndDate: '2026-06-01',
            billingPeriod: 'Monthly',
            licenseType: 'COMMERCIAL',
            discounts: [],
            proratedDetails: undefined
        }
    }
});

describe('TransactionValidationService refund discount reference date', () => {
    it('passes refunded transaction sale date for standalone refunds', async () => {
        const transactionSandboxService = { isTransactionForSandbox: jest.fn().mockResolvedValue(false) } as any;
        const transactionAdjustmentValidationService = {
            calculateFinalExpectedDiscountForTransaction: jest.fn().mockResolvedValue(makeDiscountResult())
        } as any;
        const transactionValidator = {
            validateOneTransaction: jest.fn().mockResolvedValue(makeValidationResult())
        } as any;

        const refundedTx = makeTransaction('2026-03-15', 'New');
        const previousTransactionService = {
            findRefundedTransaction: jest.fn().mockResolvedValue(refundedTx),
            findPreviousTransaction: jest.fn().mockResolvedValue(undefined),
            isRefundPartOfUpgradePair: jest.fn().mockResolvedValue(false),
            findParentTransactionForProratedTransaction: jest.fn()
        } as any;

        const service = new TransactionValidationService(
            transactionSandboxService,
            transactionAdjustmentValidationService,
            transactionValidator,
            previousTransactionService
        );

        await service.validateTransaction({
            transaction: makeTransaction('2026-05-10', 'Refund'),
            pricing: { expertDiscountOptOut: false } as any
        });

        expect(transactionValidator.validateOneTransaction).toHaveBeenCalled();
        const firstCallOpts = transactionValidator.validateOneTransaction.mock.calls[0][0];
        expect(firstCallOpts.discountReferenceSaleDate).toBe('2026-03-15');
    });

    it('does not override discount reference date for paired refunds', async () => {
        const transactionSandboxService = { isTransactionForSandbox: jest.fn().mockResolvedValue(false) } as any;
        const transactionAdjustmentValidationService = {
            calculateFinalExpectedDiscountForTransaction: jest.fn().mockResolvedValue(makeDiscountResult())
        } as any;
        const transactionValidator = {
            validateOneTransaction: jest.fn().mockResolvedValue(makeValidationResult())
        } as any;

        const refundedTx = makeTransaction('2026-03-15', 'New');
        const previousPurchaseFindResult: PreviousTransactionResult = {
            transaction: makeTransaction('2025-12-01', 'New'),
            effectiveMaintenanceEndDate: '2026-05-01'
        };
        const previousTransactionService = {
            findRefundedTransaction: jest.fn().mockResolvedValue(refundedTx),
            findPreviousTransaction: jest.fn().mockResolvedValue(previousPurchaseFindResult),
            isRefundPartOfUpgradePair: jest.fn().mockResolvedValue(true),
            findParentTransactionForProratedTransaction: jest.fn()
        } as any;

        const service = new TransactionValidationService(
            transactionSandboxService,
            transactionAdjustmentValidationService,
            transactionValidator,
            previousTransactionService
        );

        await service.validateTransaction({
            transaction: makeTransaction('2026-05-10', 'Refund'),
            pricing: { expertDiscountOptOut: false } as any
        });

        expect(transactionValidator.validateOneTransaction).toHaveBeenCalled();
        const firstCallOpts = transactionValidator.validateOneTransaction.mock.calls[0][0];
        expect(firstCallOpts.discountReferenceSaleDate).toBeUndefined();
    });
});
