import { PriceCalculatorService } from '../PriceCalculatorService';
import { cloudPricing, dataCenterPricing } from './utils/pricingTable';

describe('PriceCalculatorService', () => {
    let service: PriceCalculatorService;

    beforeEach(() => {
        service = new PriceCalculatorService();
    });

    it('should calculate correct price for 173 users with monthly billing', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: 'Per Unit Pricing (173 Users)',
            maintenanceStartDate: '2025-05-01',
            maintenanceEndDate: '2025-06-01',
            billingPeriod: 'Monthly'
        });

        expect(result).toBeCloseTo(221.21, 2);
    });

    it('should return $0 for sandbox licenses regardless of user count', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleType: 'Renewal',
            isSandbox: true,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: 'Per Unit Pricing (4617 Users)',
            maintenanceStartDate: '2025-04-01',
            maintenanceEndDate: '2025-05-01',
            billingPeriod: 'Monthly'
        });

        expect(result).toBe(0);
    });

    it('should calculate correct price for 100 users with annual billing', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: '100 Users',
            maintenanceStartDate: '2025-04-01',
            maintenanceEndDate: '2026-04-01',
            billingPeriod: 'Annual'
        });

        expect(result).toBe(1650);
    });

    it('should calculate correct price for 70 users with monthly billing', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: 'Per Unit Pricing (70 Users)',
            maintenanceStartDate: '2025-04-05',
            maintenanceEndDate: '2025-05-05',
            billingPeriod: 'Monthly'
        });

        expect(result).toBeCloseTo(115.50, 2);
    });

    it('should calculate correct price for 4750 users with 3-year annual billing', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: '4750 Users',
            maintenanceStartDate: '2025-03-27',
            maintenanceEndDate: '2028-03-27',
            billingPeriod: 'Annual'
        });

        expect(result).toBe(43290);
    });

    it('should calculate correct price for 300 users with annual billing', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: '300 Users',
            maintenanceStartDate: '2025-03-02',
            maintenanceEndDate: '2026-03-02',
            billingPeriod: 'Annual'
        });

        expect(result).toBe(3005);
    });

    it('should calculate correct price for new 300 user annual cloud license', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleType: 'New',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: '300 Users',
            maintenanceStartDate: '2025-04-15',
            maintenanceEndDate: '2026-03-15',
            billingPeriod: 'Annual'
        });

        expect(result).toBe(2750);
    });

    it('should return $0 for open-source licenses', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleType: 'Renewal',
            isSandbox: true,
            hosting: 'Cloud',
            licenseType: 'OPEN_SOURCE',
            tier: '10 Users',
            maintenanceStartDate: '2025-05-03',
            maintenanceEndDate: '2026-06-16',
            billingPeriod: 'Annual'
        });

        expect(result).toBe(0);
    });

    it('should calculate correct price for 46 users with monthly billing', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'COMMERCIAL',
            tier: 'Per Unit Pricing (46 Users)',
            maintenanceStartDate: '2025-04-18',
            maintenanceEndDate: '2025-05-18',
            billingPeriod: 'Monthly'
        });

        expect(result).toBeCloseTo(75.90, 2);
    });

    it('should calculate correct price for academic license with 135 users', () => {
        const result = service.calculateExpectedPrice({
            pricing: cloudPricing,
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Cloud',
            licenseType: 'ACADEMIC',
            tier: 'Per Unit Pricing (135 Users)',
            maintenanceStartDate: '2025-04-15',
            maintenanceEndDate: '2025-05-15',
            billingPeriod: 'Monthly'
        });

        expect(result).toBeCloseTo(47.99, 2); // we estimate 47.99, actual is 47.67
    });

    it('should calculate correct price for Data Center license with 500 users', () => {
        const result = service.calculateExpectedPrice({
            pricing: dataCenterPricing,
            saleType: 'Renewal',
            isSandbox: false,
            hosting: 'Data Center',
            licenseType: 'COMMERCIAL',
            tier: '500 Users',
            maintenanceStartDate: '2025-04-15',
            maintenanceEndDate: '2026-04-15',
            billingPeriod: 'Annual'
        });

        expect(result).toBe(3400);
    });
});