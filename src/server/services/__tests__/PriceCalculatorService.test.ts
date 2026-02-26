import { PriceCalculatorService } from '../PriceCalculatorService';
import {
    cloudAnnualPricingTiers,
    cloudPerUserPricingTiers,
    cloudPricingTierResult,
    dataCenterPricingTierResult,
    dataCenterLegacyPricing,
    dataCenterExtraLegacyPricing,
    pricingTierResult_151ff35b,
    pricingTierResult_93f67ba5,
    pricingTierResult_118424d0,
    mqbPricingTierResult
} from './pricingTable';
import { PriceResult } from '../../../server/services/types';

const stripDailyPrice = (data: PriceResult) => (
    {
        purchasePrice: data.purchasePrice,
        vendorPrice: data.vendorPrice
    });

const stripDailyPriceWithNominal = (data: PriceResult) => (
    {
        purchasePrice: data.purchasePrice,
        vendorPrice: data.vendorPrice,
        dailyNominalPrice: data.dailyNominalPrice
    });


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
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
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
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
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
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
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
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
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
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
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
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
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
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
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
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
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
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
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
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
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
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
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
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
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
            declaredPartnerDiscount: 340,
            parentProduct: 'confluence'
        }));

        expect(result).toEqual({ purchasePrice: 3060, vendorPrice: 2295 });
    });

    it('should calculate correct price for 800 users annual social impact cloud renewal', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: cloudPricingTierResult,
            saleType: 'Renewal',
            saleDate: '2025-04-27',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'SOCIAL_IMPACT',
            tier: '800 Users',
            maintenanceStartDate: '2025-02-28',
            maintenanceEndDate: '2026-02-28',
            billingPeriod: 'Annual',
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
        }));

        expect(result).toEqual({ purchasePrice: 1252, vendorPrice: 1064.20 }); // Actual is 1063.56 per Atlassian
    });

    it('should calculate correct price for 800 users annual social impact global accesscloud renewal', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: cloudPricingTierResult,
            saleType: 'Renewal',
            saleDate: '2025-04-27',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'SOCIAL_IMPACT_GLOBAL_ACCESS',
            tier: '800 Users',
            maintenanceStartDate: '2025-02-28',
            maintenanceEndDate: '2026-02-28',
            billingPeriod: 'Annual',
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
        }));

        expect(result).toEqual({ purchasePrice: 751, vendorPrice: 638.35 });
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
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
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
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
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
              dailyNominalPrice: 11.506849315068493,
              descriptors: []
            },
            expectedDiscount: 0,
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
          }));

          expect(result).toEqual({ purchasePrice: 1988, vendorPrice: 1491 });
    });

    it('calculates refund of overlapping (upgrade) transaction with same overlap descriptors', () => {
        // Refund of the same upgrade as above: overlap-adjusted amount should be negated
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: dataCenterPricingTierResult,
            saleType: 'Refund',
            saleDate: '2025-05-01',
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
                dailyNominalPrice: 11.506849315068493,
                descriptors: []
            },
            expectedDiscount: 0,
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
        }));

        // Refund of overlap-adjusted upgrade: amount should match negated upgrade (allow 1 unit rounding)
        expect(result.purchasePrice).toBeLessThanOrEqual(-1987);
        expect(result.purchasePrice).toBeGreaterThanOrEqual(-1989);
        expect(result.vendorPrice).toBeLessThanOrEqual(-1490);
        expect(result.vendorPrice).toBeGreaterThanOrEqual(-1492);
        const fullResult = service.calculateExpectedPrice({
            pricingTierResult: dataCenterPricingTierResult,
            saleType: 'Refund',
            saleDate: '2025-05-01',
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
                dailyNominalPrice: 11.506849315068493,
                descriptors: []
            },
            expectedDiscount: 0,
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
        });
        const overlapDescriptor = fullResult.descriptors.find(d =>
            d.description.includes('Subscription overlaps') && d.description.includes('days with old license')
        );
        expect(overlapDescriptor).toBeDefined();
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
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
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
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
          }));

          expect(result).toEqual({ purchasePrice: 19900, vendorPrice: 14925 });
    });

    it('calculates Confluence DC 10k+ academic pricing correctly', () => {
        const pricingTierResult = {
            tiers: dataCenterExtraLegacyPricing,
            priorTiers: undefined,
            priorPricingEndDate: undefined
        };

        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult,
            saleType: 'Renewal',
            saleDate: '2024-11-29',
            isSandbox: false,
            hosting: 'Data Center',
            licenseType: 'ACADEMIC',
            tier: '15000 Users',
            maintenanceStartDate: '2024-11-25',
            maintenanceEndDate: '2025-11-25',
            billingPeriod: 'Annual',
            previousPurchaseMaintenanceEndDate: undefined,
            previousPricing: undefined,
            expectedDiscount: 0,
            declaredPartnerDiscount: 0,
            parentProduct: 'confluence'
          }));

          expect(result).toEqual({ purchasePrice: 2438, vendorPrice: 1828.50 });
    });

    it('calculates non-Confluence DC 10k+ academic pricing correctly', () => {
        const pricingTierResult = {
            tiers: dataCenterExtraLegacyPricing,
            priorTiers: undefined,
            priorPricingEndDate: undefined
        };

        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult,
            saleType: 'Renewal',
            saleDate: '2024-11-29',
            isSandbox: false,
            hosting: 'Data Center',
            licenseType: 'ACADEMIC',
            tier: '15000 Users',
            maintenanceStartDate: '2024-11-25',
            maintenanceEndDate: '2025-11-25',
            billingPeriod: 'Annual',
            previousPurchaseMaintenanceEndDate: undefined,
            previousPricing: undefined,
            expectedDiscount: 0,
            declaredPartnerDiscount: 0,
            parentProduct: 'jira'
          }));

          expect(result).toEqual({ purchasePrice: 4875, vendorPrice: 3656.25 });
    });

    it('live: 2025-10-17 Refund 1600 Users', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: pricingTierResult_151ff35b,
            saleType: "Refund",
            saleDate: "2025-10-17",
            isSandbox: false,
            hosting: "Cloud",
            licenseType: "COMMERCIAL",
            tier: "1600 Users",
            maintenanceStartDate: "2025-02-09",
            maintenanceEndDate: "2027-02-09",
            billingPeriod: "Annual",
            expectedDiscount: 0,
            declaredPartnerDiscount: 0,
            parentProduct: "confluence"
        }));

        expect(result.purchasePrice).toBeCloseTo(-14370, 2);
        expect(result.vendorPrice).toBeCloseTo(-12214.5, 2);
    });

    it('live: 2025-08-25 Refund 200 Users', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: pricingTierResult_93f67ba5,
            saleType: "Refund",
            saleDate: "2025-08-25",
            isSandbox: false,
            hosting: "Cloud",
            licenseType: "COMMERCIAL",
            tier: "200 Users",
            maintenanceStartDate: "2025-08-20",
            maintenanceEndDate: "2026-02-20",
            billingPeriod: "Annual",
            expectedDiscount: 0,
            declaredPartnerDiscount: 0,
            parentProduct: "confluence"
        }));

        expect(result.purchasePrice).toBeCloseTo(-1462, 2);
        expect(result.vendorPrice).toBeCloseTo(-1242.7, 2);
    });

    it('live: 2025-08-19 Refund 600 Users', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: pricingTierResult_151ff35b,
            saleType: "Refund",
            saleDate: "2025-08-19",
            isSandbox: false,
            hosting: "Cloud",
            licenseType: "COMMERCIAL",
            tier: "600 Users",
            maintenanceStartDate: "2025-08-19",
            maintenanceEndDate: "2025-12-30",
            billingPeriod: "Annual",
            expectedDiscount: 0,
            declaredPartnerDiscount: 0,
            parentProduct: "confluence"
        }));

        expect(result.purchasePrice).toBeCloseTo(-1533, 2);
        expect(result.vendorPrice).toBeCloseTo(-1303.05, 2);
    });

    it('live: 2024-08-07 Upgrade 4000 Users', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: pricingTierResult_118424d0,
            saleType: "Upgrade",
            saleDate: "2024-08-07",
            isSandbox: false,
            hosting: "Data Center",
            licenseType: "COMMERCIAL",
            tier: "4000 Users",
            maintenanceStartDate: "2024-07-26",
            maintenanceEndDate: "2025-07-31",
            billingPeriod: "Annual",
            previousPurchaseMaintenanceEndDate: "2025-02-08",
            previousPricing: { purchasePrice: 6300, vendorPrice: 4725, dailyNominalPrice: 17.26027397260274, descriptors: [] },
            expectedDiscount: 0,
            declaredPartnerDiscount: 0,
            parentProduct: "confluence"
        }));

        expect(result.purchasePrice).toBeCloseTo(3696, 2);
        expect(result.vendorPrice).toBeCloseTo(2772, 2);
    });

    it('live: 2024-06-27 Upgrade 3000 Users', () => {
        const result = stripDailyPrice(service.calculateExpectedPrice({
            pricingTierResult: pricingTierResult_118424d0,
            saleType: "Upgrade",
            saleDate: "2024-06-27",
            isSandbox: false,
            hosting: "Data Center",
            licenseType: "COMMERCIAL",
            tier: "3000 Users",
            maintenanceStartDate: "2024-06-30",
            maintenanceEndDate: "2026-06-30",
            billingPeriod: "Annual",
            previousPurchaseMaintenanceEndDate: "2026-06-30",
            previousPricing: { purchasePrice: 11200, vendorPrice: 8400, dailyNominalPrice: 15.342465753424657, descriptors: [] },
            expectedDiscount: 0,
            declaredPartnerDiscount: 0,
            parentProduct: "confluence"
        }));

        expect(result.purchasePrice).toBeCloseTo(1401, 2);
        expect(result.vendorPrice).toBeCloseTo(1050.75, 2);
    });

    describe('MQB (Maximum Quantity Billing) prorated cloud monthly', () => {
        it('calculates MQB price for real-life test2: 1 user added 2026-01-19, period to 2026-02-05 (license size 63 → 11–100 tier)', () => {
            const result = stripDailyPrice(service.calculateExpectedPrice({
                pricingTierResult: mqbPricingTierResult,
                saleDate: '2026-02-06',
                saleType: 'Renewal',
                isSandbox: false,
                hosting: 'Cloud',
                licenseType: 'COMMERCIAL',
                tier: 'Per Unit Pricing (1 Users)',
                maintenanceStartDate: '2026-01-19',
                maintenanceEndDate: '2026-02-05',
                billingPeriod: 'Monthly',
                declaredPartnerDiscount: 0,
                parentProduct: 'confluence',
                proratedDetails: [{ date: '2026-01-19T10:03:51.000Z', addedUsers: 1 }],
                mqbLicenseUserCount: 63
            }));

            expect(result.purchasePrice).toBeCloseTo(1.08, 1);
            expect(result.vendorPrice).toBeCloseTo(0.92, 1);
        });

        it('calculates MQB price for real-life test1: 17 added users across 9 segments to 2026-01-15 (license size 63 → 11–100 tier)', () => {
            const proratedDetails = [
                { date: '2025-12-15T13:20:38.000Z', addedUsers: 1 },
                { date: '2025-12-15T20:19:28.000Z', addedUsers: 1 },
                { date: '2025-12-16T20:27:47.000Z', addedUsers: 1 },
                { date: '2025-12-29T18:23:55.000Z', addedUsers: 1 },
                { date: '2025-12-30T15:15:13.000Z', addedUsers: 9 },
                { date: '2025-12-30T20:06:20.000Z', addedUsers: 1 },
                { date: '2026-01-06T15:47:04.000Z', addedUsers: 1 },
                { date: '2026-01-06T18:00:32.000Z', addedUsers: 1 },
                { date: '2026-01-14T14:43:43.000Z', addedUsers: 1 }
            ];

            const result = stripDailyPrice(service.calculateExpectedPrice({
                pricingTierResult: mqbPricingTierResult,
                saleDate: '2026-01-16',
                saleType: 'Renewal',
                isSandbox: false,
                hosting: 'Cloud',
                licenseType: 'COMMERCIAL',
                tier: 'Per Unit Pricing (17 Users)',
                maintenanceStartDate: '2026-01-14',
                maintenanceEndDate: '2026-01-15',
                billingPeriod: 'Monthly',
                declaredPartnerDiscount: 0,
                parentProduct: 'confluence',
                proratedDetails,
                mqbLicenseUserCount: 63
            }));

            expect(result.purchasePrice).toBeCloseTo(18.13, 0);
            expect(result.vendorPrice).toBeCloseTo(15.41, 0);
        });

        it('calculates MQB price for real-life test3: 7 users across 6 segments (full license 184 → 100–250 tier)', () => {
            const proratedDetails = [
                { date: '2026-01-07T16:27:58.000Z', addedUsers: 2 },
                { date: '2026-01-09T21:21:49.000Z', addedUsers: 1 },
                { date: '2026-01-13T15:18:31.000Z', addedUsers: 1 },
                { date: '2026-01-20T16:17:49.000Z', addedUsers: 1 },
                { date: '2026-01-21T17:03:36.000Z', addedUsers: 1 },
                { date: '2026-01-27T18:56:10.000Z', addedUsers: 1 }
            ];

            const result = stripDailyPrice(service.calculateExpectedPrice({
                pricingTierResult: mqbPricingTierResult,
                saleDate: '2026-02-01',
                saleType: 'Renewal',
                isSandbox: false,
                hosting: 'Cloud',
                licenseType: 'COMMERCIAL',
                tier: 'Per Unit Pricing (7 Users)',
                maintenanceStartDate: '2026-01-27',
                maintenanceEndDate: '2026-02-01',
                billingPeriod: 'Monthly',
                declaredPartnerDiscount: 0,
                parentProduct: 'confluence',
                proratedDetails,
                mqbLicenseUserCount: 184
            }));

            expect(result.purchasePrice).toBeCloseTo(3.4, 0);
            expect(result.vendorPrice).toBeCloseTo(2.89, 0);
        });

        it('calculates MQB price for real-life test4: 8 users across 5 segments (full license 184 → 100–250 tier)', () => {
            const proratedDetails = [
                { date: '2025-12-04T15:35:42.000Z', addedUsers: 1 },
                { date: '2025-12-04T19:06:41.000Z', addedUsers: 1 },
                { date: '2025-12-11T21:56:51.000Z', addedUsers: 4 },
                { date: '2025-12-16T16:42:49.000Z', addedUsers: 1 },
                { date: '2025-12-22T16:14:41.000Z', addedUsers: 1 }
            ];

            const result = stripDailyPrice(service.calculateExpectedPrice({
                pricingTierResult: mqbPricingTierResult,
                saleDate: '2026-01-01',
                saleType: 'Renewal',
                isSandbox: false,
                hosting: 'Cloud',
                licenseType: 'COMMERCIAL',
                tier: 'Per Unit Pricing (8 Users)',
                maintenanceStartDate: '2025-12-22',
                maintenanceEndDate: '2026-01-01',
                billingPeriod: 'Monthly',
                declaredPartnerDiscount: 0,
                parentProduct: 'confluence',
                proratedDetails,
                mqbLicenseUserCount: 184
            }));

            expect(result.purchasePrice).toBeCloseTo(4.74, 0);
            expect(result.vendorPrice).toBeCloseTo(4.03, 0);
        });
    });

    it('live: 2023-06-09 New 25000 Users', () => {
        const result = stripDailyPriceWithNominal(service.calculateExpectedPrice({
            pricingTierResult: pricingTierResult_118424d0,
            saleType: "New",
            saleDate: "2023-06-09",
            isSandbox: false,
            hosting: "Data Center",
            licenseType: "COMMERCIAL",
            tier: "25000 Users",
            maintenanceStartDate: "2023-06-16",
            maintenanceEndDate: "2024-06-16",
            billingPeriod: "Annual",
            expectedDiscount: 562.4736842105267,
            declaredPartnerDiscount: 0,
            discounts: [{ type: "MANUAL", amount: 563 }],
            parentProduct: "confluence"
        }));

        expect(result.purchasePrice).toBeCloseTo(10688, 2);
        expect(result.vendorPrice).toBeCloseTo(8016, 2);
        expect(result.dailyNominalPrice).toBeCloseTo(30.82, 2);
    });
});