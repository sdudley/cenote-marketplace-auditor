import 'dotenv/config';
import { AppDataSource, initializeDatabase } from './config/database';
import { MarketplaceService } from './services/MarketplaceService';
import { TransactionService } from './services/TransactionService';
import { LicenseService } from './services/LicenseService';

async function main() {
    try {
        await initializeDatabase();
        console.log('Database connection established');

        const marketplaceService = new MarketplaceService(
            process.env.ATLASSIAN_ACCOUNT_USER || '',
            process.env.ATLASSIAN_ACCOUNT_API_TOKEN || '',
            process.env.ATLASSIAN_VENDOR_ID || ''
        );
        const transactionService = new TransactionService(AppDataSource);
        const licenseService = new LicenseService(AppDataSource);

        // Fetch and process transactions
        const transactions = await marketplaceService.getTransactions();
        await transactionService.processTransactions(transactions);

        // Fetch and process licenses
        const licenses = await marketplaceService.getLicenses();
        await licenseService.processLicenses(licenses);

        console.log('Data synchronization completed');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

main();