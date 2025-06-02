import 'dotenv/config';
import { AppDataSource, initializeDatabase } from '@common/config/database';
import { Pricing } from '@common/entities/Pricing';
import * as fs from 'fs';
import { IsNull } from 'typeorm';
import { userTierSorter } from '@common/utils/userTierSorter';

async function main() {
    const addonKey = process.argv[2];
    const deploymentType = process.argv[3];

    if (!addonKey || !deploymentType) {
        console.error('Please provide both addonKey and deploymentType as command line arguments');
        process.exit(1);
    }

    try {
        await initializeDatabase();
        console.log('Database connection established');

        // Find the most recent pricing record for this addon and deployment type
        const pricing = await AppDataSource.getRepository(Pricing).findOne({
            where: {
                addonKey,
                deploymentType,
                endDate: IsNull()
            },
            relations: ['items'],
            order: {
                startDate: 'DESC'
            }
        });

        if (!pricing) {
            console.error(`No active pricing found for addon ${addonKey} and deployment type ${deploymentType}`);
            process.exit(1);
        }

        // Sort the pricing items by userTier
        const sortedItems = pricing.items.sort(userTierSorter);

        // Create CSV content
        const csvContent = [
            'userTier,cost', // Header
            ...sortedItems.map(item => `${item.userTier},${item.cost}`)
        ].join('\n');

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `pricing_template_${addonKey}_${deploymentType}_${timestamp}.csv`;

        // Write to file
        fs.writeFileSync(filename, csvContent);
        console.log(`Pricing template exported to ${filename}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

main();