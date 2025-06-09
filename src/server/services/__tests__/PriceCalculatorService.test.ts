import { PriceCalculatorService, PriceResult } from '../PriceCalculatorService';
import { cloudAnnualPricingTiers, cloudPerUserPricingTiers, cloudPricingTierResult, dataCenterPricingTierResult, dataCenterLegacyPricing } from './pricingTable';

const stripDailyPrice = (data: PriceResult) => ({ purchasePrice: data.purchasePrice, vendorPrice: data.vendorPrice });

describe('PriceCalculatorService', () => {
    let service: PriceCalculatorService;

    beforeEach(() => {
        service = new PriceCalculatorService();
    });

    it('correctly maps per-user pricing to annual pricing', () => {

        const annualTiers = cloudAnnualPricingTiers.map(t => ({ userTier: t.userTier, cost: 0, pricingType: 'annual' as const }));

        const result = service.generateCloudAnnualTierFromPerUserTier({
            perUserTiers: cloudPerUserPricingTiers,
            annualTiers
        });

        expect(result).toEqual(cloudAnnualPricingTiers);
    });

    it('should calculate correct price for 173 users for cloud with monthly billing', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: cloudPricingTierResult,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: 'Per Unit Pricing (173 Users)',
            maintenanceStartDate: '2025-05-01',
            maintenanceEndDate: '2025-06-01',
            billingPeriod: 'Monthly',
            partnerDiscountFraction: 0
        }));

        expect(result).toEqual({ purchasePrice: 221.21, vendorPrice: 188.03 });
    });

    it('should return $0 for sandbox licenses regardless of user count', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: cloudPricingTierResult,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: true,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: 'Per Unit Pricing (4617 Users)',
            maintenanceStartDate: '2025-04-01',
            maintenanceEndDate: '2025-05-01',
            billingPeriod: 'Monthly',
            partnerDiscountFraction: 0
        }));

        expect(result).toEqual({ purchasePrice: 0, vendorPrice: 0 });
    });

    it('should calculate correct price for 70 users for cloud with monthly billing', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: cloudPricingTierResult,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: 'Per Unit Pricing (70 Users)',
            maintenanceStartDate: '2025-04-05',
            maintenanceEndDate: '2025-05-05',
            billingPeriod: 'Monthly',
            partnerDiscountFraction: 0
        }));

        expect(result).toEqual({ purchasePrice: 115.50, vendorPrice: 98.18 }); // actual is 98.17 per Atlssian
    });

    it('should calculate correct price for 4750 users with cloud license with 3-year annual billing', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: cloudPricingTierResult,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: '4750 Users',
            maintenanceStartDate: '2025-03-27',
            maintenanceEndDate: '2028-03-27',
            billingPeriod: 'Annual',
            partnerDiscountFraction: 0
        }));

        expect(result).toEqual({ purchasePrice: 43290, vendorPrice: 36796.50 });
    });

    it('should calculate correct price for 300 user cloud license with annual billing', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: cloudPricingTierResult,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: '300 Users',
            maintenanceStartDate: '2025-03-02',
            maintenanceEndDate: '2026-03-02',
            billingPeriod: 'Annual',
            partnerDiscountFraction: 0
        }));

        expect(result).toEqual({ purchasePrice: 3005, vendorPrice: 2554.25 });
    });


    it('should calculate correct price for 250 user cloud license with annual billing', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: cloudPricingTierResult,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: '250 Users',
            maintenanceStartDate: '2025-03-02',
            maintenanceEndDate: '2026-03-02',
            billingPeriod: 'Annual',
            partnerDiscountFraction: 0
        }));

        expect(result).toEqual({ purchasePrice: 2805, vendorPrice: 2384.25 });
    });

    it('should calculate correct price for new 300 user 11-month cloud license', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: cloudPricingTierResult,
            saleDate: '2025-05-01',
            saleType: 'New',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: '300 Users',
            maintenanceStartDate: '2025-04-15',
            maintenanceEndDate: '2026-03-15',
            billingPeriod: 'Annual',
            partnerDiscountFraction: 0
        }));

        expect(result).toEqual({ purchasePrice: 2750, vendorPrice: 2337.50 });
    });

    it('should return $0 for open-source cloud licenses', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: cloudPricingTierResult,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: true,
            hosting: 'Cloud',
            licenseType: 'OPEN_SOURCE',
            tier: '10 Users',
            maintenanceStartDate: '2025-05-03',
            maintenanceEndDate: '2026-06-16',
            billingPeriod: 'Annual',
            partnerDiscountFraction: 0
        }));

        expect(result).toEqual({ purchasePrice: 0, vendorPrice: 0 });
    });

    it('should calculate correct price for 16 users cloud license with monthly billing', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: cloudPricingTierResult,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: 'Per Unit Pricing (16 Users)',
            maintenanceStartDate: '2025-05-11',
            maintenanceEndDate: '2025-06-11',
            billingPeriod: 'Monthly',
            partnerDiscountFraction: 0
        }));

        expect(result).toEqual({ purchasePrice: 26.40, vendorPrice: 22.44 });
    });

    it('should calculate correct price for 46 users cloud license with monthly billing', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: cloudPricingTierResult,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: 'Per Unit Pricing (46 Users)',
            maintenanceStartDate: '2025-04-18',
            maintenanceEndDate: '2025-05-18',
            billingPeriod: 'Monthly',
            partnerDiscountFraction: 0
        }));

        expect(result).toEqual({ purchasePrice: 75.90, vendorPrice: 64.51 });
    });

    it('should calculate correct price for academic cloud license with 135 users', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: cloudPricingTierResult,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'ACADEMIC',
            tier: 'Per Unit Pricing (135 Users)',
            maintenanceStartDate: '2025-04-15',
            maintenanceEndDate: '2025-05-15',
            billingPeriod: 'Monthly',
            partnerDiscountFraction: 0
        }));

        expect(result).toEqual({ purchasePrice: 47.99, vendorPrice: 40.79 }); // we estimate 40.79, actual is 40.52
    });

    it('should calculate correct price for Data Center license with 500 users', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: dataCenterPricingTierResult,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Data Center',
            licenseType: 'COMMERCIAL',
            tier: '500 Users',
            maintenanceStartDate: '2025-04-15',
            maintenanceEndDate: '2026-04-15',
            billingPeriod: 'Annual',
            partnerDiscountFraction: 0
        }));

        expect(result).toEqual({ purchasePrice: 3400, vendorPrice: 2550 });
    });

    it('should calculate correct price for Data Center license with 500 users and 10% partner discount', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: dataCenterPricingTierResult,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Data Center',
            licenseType: 'COMMERCIAL',
            tier: '500 Users',
            maintenanceStartDate: '2025-04-15',
            maintenanceEndDate: '2026-04-15',
            billingPeriod: 'Annual',
            partnerDiscountFraction: 0.1
        }));

        expect(result).toEqual({ purchasePrice: 3060, vendorPrice: 2295 });
    });

    it('should calculate correct price for 800 users annual community cloud renewal', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: cloudPricingTierResult,
            saleType: 'Renewal',
            saleDate: '2025-04-27',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMUNITY',
            tier: '800 Users',
            maintenanceStartDate: '2025-02-28',
            maintenanceEndDate: '2026-02-28',
            billingPeriod: 'Annual',
            partnerDiscountFraction: 0
        }));

        expect(result).toEqual({ purchasePrice: 1252, vendorPrice: 1064.20 }); // Actual is 1063.56 per Atlassian
    });

    it('should calculate correct price for 15k DC renewal with reseller discount', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: dataCenterPricingTierResult,
            saleType: 'Renewal',
            saleDate: '2025-04-07',
            isSandbox: false,
            hosting: 'Data Center',
            licenseType: 'COMMERCIAL',
            tier: '15000 Users',
            maintenanceStartDate: '2025-06-01',
            maintenanceEndDate: '2026-06-01',
            billingPeriod: 'Annual',
            previousPricing: undefined,
            expectedDiscount: 585,
            partnerDiscountFraction: 0
        }));

        expect(result).toEqual({ purchasePrice: 11115, vendorPrice: 8336.25 });
    });

    it('calculates correct refund price with reseller discount', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: dataCenterPricingTierResult,
            saleType: 'Refund',
            saleDate: '2025-04-28',
            isSandbox: false,
            hosting: 'Data Center',
            licenseType: 'COMMERCIAL',
            tier: '500 Users',
            maintenanceStartDate: '2025-04-29',
            maintenanceEndDate: '2026-04-29',
            billingPeriod: 'Annual',
            previousPricing: undefined,
            expectedDiscount: 170,
            partnerDiscountFraction: 0
          }));
          expect(result).toEqual({ purchasePrice: -3230, vendorPrice: -2422.50 });
    });

    it('calculated DC upgrades correctly with overlapping maintenance periods', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: dataCenterPricingTierResult,
            saleType: 'Upgrade',
            saleDate: '2025-04-14',
            isSandbox: false,
            hosting: 'Data Center',
            licenseType: 'COMMERCIAL',
            tier: '2000 Users',
            maintenanceStartDate: '2025-04-14',
            maintenanceEndDate: '2026-01-29',
            billingPeriod: 'Annual',
            previousPurchaseMaintenanceEndDate: '2026-01-29',
            previousPricing: {
              purchasePrice: 4200,
              vendorPrice: 3150,
              dailyNominalPrice: 11.506849315068493
            },
            expectedDiscount: 0,
            partnerDiscountFraction: 0
          }));

          expect(result).toEqual({ purchasePrice: 1988, vendorPrice: 1491 });
    });

    it('calculates non-full-month monthly pricing correctly', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: cloudPricingTierResult,
            saleType: 'New',
            saleDate: '2025-02-19',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: 'Per Unit Pricing (29 Users)',
            maintenanceStartDate: '2025-02-19',
            maintenanceEndDate: '2025-03-07',
            billingPeriod: 'Monthly',
            previousPurchaseMaintenanceEndDate: undefined,
            previousPricing: undefined,
            expectedDiscount: 0,
            partnerDiscountFraction: 0
          }));

          expect(result).toEqual({ purchasePrice: 27.78, vendorPrice: 23.62 }); // Atlassian actual is 27.76, 23.60
    });

    it('calculates unlimited DC tier pricing correctly', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: {
                tiers: dataCenterLegacyPricing,
                priorTiers: undefined,
                priorPricingEndDate: undefined
            },
            saleType: 'Renewal',
            saleDate: '2025-01-31',
            isSandbox: false,
            hosting: 'Data Center',
            licenseType: 'COMMERCIAL',
            tier: 'Unlimited Users',
            maintenanceStartDate: '2025-01-31',
            maintenanceEndDate: '2026-01-31',
            billingPeriod: 'Annual',
            previousPurchaseMaintenanceEndDate: undefined,
            previousPricing: undefined,
            expectedDiscount: 0,
            partnerDiscountFraction: 0
          }));

          expect(result).toEqual({ purchasePrice: 19900, vendorPrice: 14925 });
    });
});