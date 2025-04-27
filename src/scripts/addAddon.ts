import 'dotenv/config';
import { AppDataSource, initializeDatabase } from '../config/database';
import { AddonService } from '../services/AddonService';

async function main() {
    const addonKey = process.argv[2];
    if (!addonKey) {
        console.error('Please provide an addonKey as a command line argument');
        process.exit(1);
    }

    try {
        await initializeDatabase();
        console.log('Database connection established');

        const addonService = new AddonService(AppDataSource);
        await addonService.addAddon(addonKey);
        console.log(`Successfully added addon: ${addonKey}`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

main();