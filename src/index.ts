import 'dotenv/config';
import { initializeDatabase } from './config/database';
import { MarketplaceService } from './services/MarketplaceService';
import { AddonService } from './services/AddonService';
import { TransactionService } from './services/TransactionService';
import { LicenseService } from './services/LicenseService';
import { PricingService } from './services/PricingService';
import { ValidationService } from './services/ValidationService';

async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const fetchTransactions = args.length === 0 || args.includes('--with-transactions');
    const fetchLicenses = args.length === 0 || args.includes('--with-licenses');
    const fetchPricingData = args.length === 0 || args.includes('--with-pricing');
    const validateTransactions = args.length === 0 || args.includes('--validate-transactions');

    console.log('Starting Marketplace Auditor...');
    console.log('Fetch options:');
    console.log(`- Transactions: ${fetchTransactions ? 'enabled' : 'disabled'}`);
    console.log(`- Licenses: ${fetchLicenses ? 'enabled' : 'disabled'}`);
    console.log(`- Pricing: ${fetchPricingData ? 'enabled' : 'disabled'}`);
    console.log(`- Validation: ${validateTransactions ? 'enabled' : 'disabled'}`);

    let dataSource;
    try {
        dataSource = await initializeDatabase();
        console.log('Database connection established');

        const marketplaceService = new MarketplaceService(
            process.env.ATLASSIAN_ACCOUNT_USER || '',
            process.env.ATLASSIAN_ACCOUNT_API_TOKEN || '',
            process.env.ATLASSIAN_VENDOR_ID || ''
        );
        const addonService = new AddonService(dataSource);
        const transactionService = new TransactionService(dataSource);
        const licenseService = new LicenseService(dataSource);
        const pricingService = new PricingService(dataSource, marketplaceService);
        const validationService = new ValidationService(dataSource, pricingService);

        if (fetchTransactions) {
            console.log('Fetching transactions...');
            const transactions = await marketplaceService.getTransactions();
            await transactionService.processTransactions(transactions);
        }

        if (fetchLicenses) {
            console.log('Fetching licenses...');
            const licenses = await marketplaceService.getLicenses();
            await licenseService.processLicenses(licenses);
        }

        if (fetchPricingData) {
            console.log('Fetching pricing data...');
            await pricingService.fetchAndDisplayPricing();
        }

        if (validateTransactions) {
            await validationService.validateTransactions();
        }

        console.log('All operations completed successfully');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        if (dataSource) {
            await dataSource.destroy();
        }
        process.exit(0);
    }
}

main();