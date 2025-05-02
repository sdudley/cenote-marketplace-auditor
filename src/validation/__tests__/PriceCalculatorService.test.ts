import { PriceCalculatorService } from '../PriceCalculatorService';
import { cloudPricing, dataCenterPricing } from './utils/pricingTable';

describe('PriceCalculatorService', () => {
    let service: PriceCalculatorService;

    beforeEach(() => {
        service = new PriceCalculatorService();
    });

    it('should calculate correct price for 173 users for cloud with monthly billing', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: 'Per Unit Pricing (173 Users)',
            maintenanceStartDate: '2025-05-01',
            maintenanceEndDate: '2025-06-01',
            billingPeriod: 'Monthly'
        });

        expect(result).toEqual({ purchasePrice: 221.21, vendorPrice: 188.03 });
    });

    it('should return $0 for sandbox licenses regardless of user count', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: true,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: 'Per Unit Pricing (4617 Users)',
            maintenanceStartDate: '2025-04-01',
            maintenanceEndDate: '2025-05-01',
            billingPeriod: 'Monthly'
        });

        expect(result).toEqual({ purchasePrice: 0, vendorPrice: 0 });
    });

    it('should calculate correct price for 70 users for cloud with monthly billing', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: 'Per Unit Pricing (70 Users)',
            maintenanceStartDate: '2025-04-05',
            maintenanceEndDate: '2025-05-05',
            billingPeriod: 'Monthly'
        });

        expect(result).toEqual({ purchasePrice: 115.50, vendorPrice: 98.18 }); // actual is 98.17 per Atlssian
    });

    it('should calculate correct price for 4750 users with cloud license with 3-year annual billing', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: '4750 Users',
            maintenanceStartDate: '2025-03-27',
            maintenanceEndDate: '2028-03-27',
            billingPeriod: 'Annual'
        });

        expect(result).toEqual({ purchasePrice: 43290, vendorPrice: 36796.50 });
    });

    it('should calculate correct price for 300 user cloud license with annual billing', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: '300 Users',
            maintenanceStartDate: '2025-03-02',
            maintenanceEndDate: '2026-03-02',
            billingPeriod: 'Annual'
        });

        expect(result).toEqual({ purchasePrice: 3005, vendorPrice: 2554.25 });
    });

    it('should calculate correct price for new 300 user 11-month cloud license', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleDate: '2025-05-01',
            saleType: 'New',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: '300 Users',
            maintenanceStartDate: '2025-04-15',
            maintenanceEndDate: '2026-03-15',
            billingPeriod: 'Annual'
        });

        expect(result).toEqual({ purchasePrice: 2750, vendorPrice: 2337.50 });
    });

    it('should return $0 for open-source cloud licenses', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: true,
            hosting: 'Cloud',
            licenseType: 'OPEN_SOURCE',
            tier: '10 Users',
            maintenanceStartDate: '2025-05-03',
            maintenanceEndDate: '2026-06-16',
            billingPeriod: 'Annual'
        });

        expect(result).toEqual({ purchasePrice: 0, vendorPrice: 0 });
    });

    it('should calculate correct price for 46 users cloud license with monthly billing', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: 'Per Unit Pricing (46 Users)',
            maintenanceStartDate: '2025-04-18',
            maintenanceEndDate: '2025-05-18',
            billingPeriod: 'Monthly'
        });

        expect(result).toEqual({ purchasePrice: 75.90, vendorPrice: 64.52 }); // actual is 64.51 per Atlassian
    });

    it('should calculate correct price for academic cloud license with 135 users', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'ACADEMIC',
            tier: 'Per Unit Pricing (135 Users)',
            maintenanceStartDate: '2025-04-15',
            maintenanceEndDate: '2025-05-15',
            billingPeriod: 'Monthly'
        });

        expect(result).toEqual({ purchasePrice: 47.99, vendorPrice: 40.79 }); // we estimate 40.79, actual is 40.52
    });

    it('should calculate correct price for Data Center license with 500 users', () => {
        const result = service.calculateExpectedPrice({
            pricing: dataCenterPricing,
            saleDate: '2025-05-01',
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Data Center',
            licenseType: 'COMMERCIAL',
            tier: '500 Users',
            maintenanceStartDate: '2025-04-15',
            maintenanceEndDate: '2026-04-15',
            billingPeriod: 'Annual'
        });

        expect(result).toEqual({ purchasePrice: 3400, vendorPrice: 2550 });
    });

    it('should calculate correct price for 800 users annual community cloud renewal', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleType: 'Renewal',
            saleDate: '2025-04-27',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMUNITY',
            tier: '800 Users',
            maintenanceStartDate: '2025-02-28',
            maintenanceEndDate: '2026-02-28',
            billingPeriod: 'Annual'
        });

        expect(result).toEqual({ purchasePrice: 1252, vendorPrice: 1064.20 }); // actual is 1063.56 per Atlassian
});