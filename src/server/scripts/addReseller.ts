import 'dotenv/config';
import { Reseller, ResellerMatchMode } from '../../common/entities/Reseller';
import { initializeDatabase } from '../../common/config/database';
import { ResellerDaoService } from '../../common/database/ResellerDaoService';
import { configureContainer } from '../../common/config/container';
import { TYPES } from '../../common/config/types';

async function addReseller() {
    const args = process.argv.slice(2);
    if (args.length !== 3) {
        console.error('Usage: npm run add-reseller <name> <matchMode> <discountAmount>');
        console.error('Example: npm run add-reseller "Atlassian Reseller Inc" exact 0.00');
        process.exit(1);
    }

    const [name, matchMode, discountAmountStr] = args;

    if (matchMode !== 'exact' && matchMode !== 'substring') {
        console.error('matchMode must be either "exact" or "substring"');
        process.exit(1);
    }

    const discountAmount = parseFloat(discountAmountStr);
    if (isNaN(discountAmount) || discountAmount < 0.01 || discountAmount > 1.00) {
        console.error('discountAmount must be a valid number (0.01 - 1.00)');
        process.exit(1);
    }

    const dataSource = await initializeDatabase();
    const container = configureContainer(dataSource);
    const resellerService = container.get<ResellerDaoService>(TYPES.ResellerDaoService);

    const newReseller = new Reseller();
    newReseller.name = name;
    newReseller.matchMode = matchMode as ResellerMatchMode;
    newReseller.discountAmount = discountAmount;

    await resellerService.saveReseller(newReseller);
    console.log(`Added reseller: ${name}`);

    await dataSource.destroy();
}

addReseller().catch(console.error);