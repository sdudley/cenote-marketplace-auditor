import { Transaction } from '#common/entities/Transaction.js';
import { TransactionValidator } from '../TransactionValidator.js';
import { PricingService } from '#server/services/PricingService.js';
import { PriceCalculatorService } from '#server/services/PriceCalculatorService.js';
import { AddonDao } from '#server/database/dao/AddonDao.js';
import { AccumulatedRevenueService } from '#server/services/AccumulatedRevenueService.js';
import { mqbPricingTierResult } from '../../__tests__/pricingTable.js';
import { DiscountResult } from '../types.js';
import { PreviousTransactionResult } from '#server/services/types.js';

const ADDON_KEY = 'com.mycompany.myapp';
const ENTITLEMENT_ID = 'abcdefghijklmnopqrstuvwxyz';

const noDiscount: DiscountResult = {
    discountToUse: 0,
    hasExpectedAdjustments: false,
    hasActualAdjustments: false,
    adjustmentNotes: []
};

function createTransactionFromSale(
    id: string,
    purchaseDetails: Record<string, unknown>
): Transaction {
    const transaction = new Transaction();
    transaction.id = id;
    transaction.entitlementId = ENTITLEMENT_ID;
    transaction.data = {
        addonKey: ADDON_KEY,
        customerDetails: { country: 'United States' },
        purchaseDetails
    } as Transaction['data'];
    return transaction;
}

/** Original purchase (sale-1): 100 Users, partial year through 2026-12-30. */
const sale1 = createTransactionFromSale('sale-1', {
    tier: '100 Users',
    hosting: 'Cloud',
    saleDate: '2026-04-28',
    saleType: 'New',
    licenseType: 'COMMERCIAL',
    vendorAmount: 940.42,
    billingPeriod: 'Annual',
    purchasePrice: 1175.52,
    maintenanceEndDate: '2026-12-30',
    maintenanceStartDate: '2026-05-27',
    parentProductEdition: 'Enterprise'
});

/** Upgrade (sale-2): 250000 Users, extended through 2027-05-27. */
const sale2 = createTransactionFromSale('sale-2', {
    tier: '250000 Users',
    oldTier: '100 Users',
    hosting: 'Cloud',
    saleDate: '2026-05-28',
    saleType: 'Upgrade',
    licenseType: 'COMMERCIAL',
    vendorAmount: 309008,
    billingPeriod: 'Annual',
    purchasePrice: 386260,
    maintenanceEndDate: '2027-05-27',
    maintenanceStartDate: '2026-05-27',
    parentProductEdition: 'Enterprise'
});

/** Refund of the upgrade (sale-3): same maintenance period as sale-2. */
const sale3 = createTransactionFromSale('sale-3', {
    tier: '250000 Users',
    hosting: 'Cloud',
    saleDate: '2026-06-01',
    saleType: 'Refund',
    licenseType: 'COMMERCIAL',
    vendorAmount: -309008,
    billingPeriod: 'Annual',
    purchasePrice: -386260,
    maintenanceEndDate: '2027-05-27',
    maintenanceStartDate: '2026-05-27',
    parentProductEdition: 'Enterprise'
});

const previousPurchaseFromSale1: PreviousTransactionResult = {
    transaction: sale1,
    effectiveMaintenanceEndDate: '2026-12-30'
};

function findOverlapDescriptor(descriptors: { description: string }[]): string | undefined {
    return descriptors.find(d =>
        d.description.includes('Subscription overlaps') &&
        d.description.includes('days with old license')
    )?.description;
}

describe('TransactionValidator upgrade refund overlap', () => {
    let validator: TransactionValidator;
    let accumulatedRevenueService: { getAccumulatedRevenueBefore: jest.Mock };

    beforeEach(() => {
        const pricingService = {
            getPricingTiers: jest.fn().mockResolvedValue(mqbPricingTierResult)
        } as unknown as PricingService;

        const addonDao = {
            getParentProductForApp: jest.fn().mockResolvedValue('confluence'),
            getAddon: jest.fn().mockResolvedValue({
                forgeMigrationDate: null,
                alwaysForge: false
            })
        } as unknown as AddonDao;

        // Well above the "less than $1M" threshold, so Atlassian's standard take rates apply.
        accumulatedRevenueService = { getAccumulatedRevenueBefore: jest.fn().mockResolvedValue(5_000_000) };

        validator = new TransactionValidator(
            pricingService,
            new PriceCalculatorService(),
            addonDao,
            accumulatedRevenueService as unknown as AccumulatedRevenueService
        );
    });

    it('resolves accumulated revenue separately for the current and the previous purchase', async () => {
        accumulatedRevenueService.getAccumulatedRevenueBefore.mockImplementation(async (date: string) =>
            date === sale2.data.purchaseDetails.saleDate ? 900_000 : 100_000
        );

        const result = await validator.validateOneTransaction({
            transaction: sale2,
            useLegacyPricingTierForCurrent: false,
            useLegacyPricingTierForPrevious: false,
            expectedDiscount: 0,
            hasActualAdjustments: false,
            isSandbox: false,
            previousPurchaseFindResult: previousPurchaseFromSale1,
            expectedDiscountForPreviousPurchase: noDiscount
        });

        expect(accumulatedRevenueService.getAccumulatedRevenueBefore).toHaveBeenCalledWith('2026-05-28'); // current
        expect(accumulatedRevenueService.getAccumulatedRevenueBefore).toHaveBeenCalledWith('2026-04-28'); // previous
        expect(result.pricingOpts.accRevenue).toBe(900_000);
    });

    it('uses the refunded sale date for accumulated revenue on standalone refunds', async () => {
        await validator.validateOneTransaction({
            transaction: sale3,
            useLegacyPricingTierForCurrent: false,
            useLegacyPricingTierForPrevious: false,
            expectedDiscount: 0,
            hasActualAdjustments: false,
            isSandbox: false,
            previousPurchaseFindResult: undefined,
            expectedDiscountForPreviousPurchase: undefined,
            discountReferenceSaleDate: '2026-05-28'
        });

        expect(accumulatedRevenueService.getAccumulatedRevenueBefore).toHaveBeenCalledWith('2026-05-28');
        expect(accumulatedRevenueService.getAccumulatedRevenueBefore).not.toHaveBeenCalledWith('2026-06-01');
    });

    it('applies the full-amount payout when accumulated revenue is under $1M', async () => {
        const opts = {
            transaction: sale2,
            useLegacyPricingTierForCurrent: false,
            useLegacyPricingTierForPrevious: false,
            expectedDiscount: 0,
            hasActualAdjustments: false,
            isSandbox: false,
            previousPurchaseFindResult: previousPurchaseFromSale1,
            expectedDiscountForPreviousPurchase: noDiscount
        };

        accumulatedRevenueService.getAccumulatedRevenueBefore.mockResolvedValue(5_000_000);
        const standard = await validator.validateOneTransaction(opts);

        accumulatedRevenueService.getAccumulatedRevenueBefore.mockResolvedValue(10_000);
        const underThreshold = await validator.validateOneTransaction(opts);

        expect(underThreshold.price.vendorPrice).toBeCloseTo(underThreshold.price.purchasePrice, 2);
        expect(standard.price.vendorPrice).toBeLessThan(standard.price.purchasePrice);
    });

    it('applies the same overlap adjustment to upgrade and its refund across sale-1/2/3', async () => {
        const upgradeResult = await validator.validateOneTransaction({
            transaction: sale2,
            useLegacyPricingTierForCurrent: false,
            useLegacyPricingTierForPrevious: false,
            expectedDiscount: 0,
            hasActualAdjustments: false,
            isSandbox: false,
            previousPurchaseFindResult: previousPurchaseFromSale1,
            expectedDiscountForPreviousPurchase: noDiscount
        });

        const refundResult = await validator.validateOneTransaction({
            transaction: sale3,
            useLegacyPricingTierForCurrent: false,
            useLegacyPricingTierForPrevious: false,
            expectedDiscount: 0,
            hasActualAdjustments: false,
            isSandbox: false,
            previousPurchaseFindResult: previousPurchaseFromSale1,
            expectedDiscountForPreviousPurchase: noDiscount
        });

        const upgradeOverlap = findOverlapDescriptor(upgradeResult.price.descriptors);
        const refundOverlap = findOverlapDescriptor(refundResult.price.descriptors);

        expect(upgradeOverlap).toBeDefined();
        expect(refundOverlap).toBeDefined();
        expect(upgradeOverlap).toContain('217 days');
        expect(refundOverlap).toContain('217 days');

        expect(refundResult.pricingOpts.previousPricing).toBeDefined();
        expect(refundResult.pricingOpts.previousPricing?.purchasePrice).toBeGreaterThan(0);

        expect(refundResult.price.purchasePrice).toBe(-upgradeResult.price.purchasePrice);
        expect(refundResult.price.vendorPrice).toBe(-upgradeResult.price.vendorPrice);
    });
});
