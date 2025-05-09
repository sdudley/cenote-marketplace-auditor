import 'reflect-metadata';
import 'dotenv/config';
import { initializeDatabase } from './config/database';
import { configureContainer } from './config/container';
import { TYPES } from './config/types';
import { MarketplaceService } from './services/MarketplaceService';
import { AddonService } from './services/AddonService';
import { TransactionService } from './services/TransactionService';
import { LicenseService } from './services/LicenseService';
import { PricingService } from './services/PricingService';
import { ValidationService } from './validation/ValidationService';
import { PriceCalculatorService } from './validation/PriceCalculatorService';

async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const withFetchApps = args.length === 0 || args.includes('--with-fetch-apps');
    const fetchPricingData = args.length === 0 || args.includes('--with-pricing');
    const fetchTransactions = args.length === 0 || args.includes('--with-transactions');
    const fetchLicenses = args.length === 0 || args.includes('--with-licenses');
    const validateTransactions = args.length === 0 || args.includes('--validate-transactions');

    console.log('Starting Marketplace Auditor...');
    console.log('Fetch options:');
    console.log(`- Fetch Apps: ${withFetchApps ? 'enabled' : 'disabled'}`);
    console.log(`- Fetch Pricing: ${fetchPricingData ? 'enabled' : 'disabled'}`);
    console.log(`- Fetch New Transactions: ${fetchTransactions ? 'enabled' : 'disabled'}`);
    console.log(`- Fetch New Licenses: ${fetchLicenses ? 'enabled' : 'disabled'}`);
    console.log(`- Validate Transactions: ${validateTransactions ? 'enabled' : 'disabled'}`);

    let dataSource;
    try {
        dataSource = await initializeDatabase();
        console.log('Database connection established');

        // Configure and create container
        const container = configureContainer(dataSource);

        // Get service instances from container
        const marketplaceService = container.get<MarketplaceService>(TYPES.MarketplaceService);
        const addonService = container.get<AddonService>(TYPES.AddonService);
        const transactionService = container.get<TransactionService>(TYPES.TransactionService);
        const licenseService = container.get<LicenseService>(TYPES.LicenseService);
        const pricingService = container.get<PricingService>(TYPES.PricingService);
        const validationService = container.get<ValidationService>(TYPES.ValidationService);

        if (withFetchApps) {
            console.log('Fetching apps...');
            await addonService.syncAddonKeys();
        }

        if (fetchPricingData) {
            console.log('\nFetching pricing data...');
            await pricingService.fetchPricing();
        }

        if (fetchTransactions) {
            console.log('\nFetching transactions...');
            const transactions = await marketplaceService.getTransactions();
            await transactionService.processTransactions(transactions);
        }

        if (fetchLicenses) {
            console.log('\nFetching licenses...');
            const licenses = await marketplaceService.getLicenses();
            await licenseService.processLicenses(licenses);
        }

        if (validateTransactions) {
            console.log('\nValidating transactions...');
            await validationService.validateTransactions();
        }

        console.log('Processing completed successfully');
    } catch (error) {
        console.error('Error during processing:', error);
        process.exit(1);
    } finally {
        if (dataSource) {
            await dataSource.destroy();
        }
        process.exit(0);
    }
}

main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});