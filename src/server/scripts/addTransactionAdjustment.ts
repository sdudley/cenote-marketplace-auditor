import 'dotenv/config';
import { Transaction } from '@common/entities/Transaction';
import { TransactionAdjustment } from '@common/entities/TransactionAdjustment';
import { initializeDatabase } from '../config/database';
import { TransactionAdjustmentDao } from '../database/TransactionAdjustmentDao';
import { configureContainer } from '../config/container';
import { TYPES } from '../config/types';
import { formatCurrency } from '@common/utils/formatCurrency';

async function addTransactionAdjustment() {
    const args = process.argv.slice(2);
    if (args.length < 2 || args.length > 3) {
        console.error('Usage: npm run add-transaction-adjustment <transactionId> <discountAmount> [notes]');
        console.error('Example: npm run add-transaction-adjustment 74f075cb-7afc-445d-ba3b-cc5d874341fc 0.10 "Special discount for customer X"');
        process.exit(1);
    }

    const [transactionId, discountAmountStr, notes] = args;

    const discountAmount = parseFloat(discountAmountStr);
    if (isNaN(discountAmount)) {
        console.error('discountAmount must be a valid number');
        process.exit(1);
    }

    const dataSource = await initializeDatabase();
    const container = configureContainer(dataSource);
    const adjustmentService = container.get<TransactionAdjustmentDao>(TYPES.TransactionAdjustmentDao);
    const transactionRepository = dataSource.getRepository(Transaction);

    const transaction = await transactionRepository.findOne({ where: { id: transactionId } });
    if (!transaction) {
        console.error(`Transaction with id ${transactionId} not found`);
        await dataSource.destroy();
        process.exit(1);
    }

    const adjustment = new TransactionAdjustment();
    adjustment.transaction = transaction;
    adjustment.purchasePriceDiscount = discountAmount;
    adjustment.notes = notes;

    const savedAdjustment = await adjustmentService.saveAdjustment(adjustment);
    if (savedAdjustment) {
        console.log(`Adjustment added for transaction ${transactionId} for ${formatCurrency(discountAmount)}`);
    } else {
        console.error(`Could not save adjustment for transaction ${transactionId}`);
    }

    await dataSource.destroy();
}

addTransactionAdjustment().catch(console.error);