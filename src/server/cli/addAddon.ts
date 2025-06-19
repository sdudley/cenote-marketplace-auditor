import 'dotenv/config';
import { initializeDatabase } from '../config/database';
import { configureContainer } from '../config/container';
import { TYPES } from '../config/types';
import { AddonService } from '../services/AddonService';

async function main() {
    const addonKey = process.argv[2];
    if (!addonKey) {
        console.error('Please provide an addonKey as a command line argument');
        process.exit(1);
    }

    const parentProduct = process.argv[3];
    if (!parentProduct) {
        console.error('Please provide a parentProduct as a command line argument');
        process.exit(1);
    }

    let dataSource;
    try {
        dataSource = await initializeDatabase();
        console.log('Database connection established');

        // Configure and create container
        const container = configureContainer(dataSource);

        // Get AddonService instance from container
        const addonService = container.get<AddonService>(TYPES.AddonService);
        await addonService.addAddon({ addonKey, parentProduct });
        console.log(`Successfully added addon: ${addonKey} with parent product: ${parentProduct}`);
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

main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});