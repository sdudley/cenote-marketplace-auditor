import 'reflect-metadata';
import 'dotenv/config';
import { initializeDatabase } from '@common/config/database';
import { configureContainer } from '@common/config/container';
import { TYPES } from '@common/config/types';
import { MarketplaceService } from './MarketplaceService';
import { AddonService } from 'src/server/jobrunner/AddonService';
import { TransactionService } from './TransactionService';
import { LicenseService } from './LicenseService';
import { PricingService } from './PricingService';
import { ValidationService } from './ValidationService';


async function main() {
    const args = process.argv.slice(2);
    const flags = new Set(args);

    const dataSource = await initializeDatabase();
    const container = configureContainer(dataSource);

    // Parse start date if provided
    let startDate: string|undefined;
    const startDateArg = args.find(arg => arg.startsWith('--start-date='));
    if (startDateArg) {
        startDate = startDateArg.split('=')[1];
    }

    try {
        const marketplaceService = container.get<MarketplaceService>(TYPES.MarketplaceService);

        if (flags.size === 0 || flags.has('--with-fetch-apps')) {
            const addonService = container.get<AddonService>(TYPES.AddonService);
            await addonService.syncAddonKeys();
        }

        if (flags.size === 0 || flags.has('--with-pricing')) {
            const pricingService = container.get<PricingService>(TYPES.PricingService);
            await pricingService.fetchPricing();
        }

        if (flags.size === 0 || flags.has('--with-transactions')) {
            console.log(`\n=== Fetching transactions ===`);

            const transactions = await marketplaceService.getTransactions();
            const transactionService = container.get<TransactionService>(TYPES.TransactionService);
            await transactionService.processTransactions(transactions);
        }

        if (flags.size === 0 || flags.has('--with-licenses')) {
            console.log(`\n=== Fetching licenses ===`);

            const licenses = await marketplaceService.getLicenses();
            const licenseService = container.get<LicenseService>(TYPES.LicenseService);
            await licenseService.processLicenses(licenses);
        }

        if (flags.size === 0 || flags.has('--validate-transactions')) {
            const validationService = container.get<ValidationService>(TYPES.ValidationService);
            await validationService.validateTransactions(startDate);
        }
    } catch (e) {
        console.error('Unhandled error:', e);
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