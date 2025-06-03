import 'dotenv/config';
import { AppDataSource, initializeDatabase } from '../config/database';
import { IgnoredFieldService } from '../services/IgnoredFieldService';
import { RecordType } from '#common/entities/IgnoredField';

async function main() {
    const recordType = process.argv[2] as RecordType;
    const fieldName = process.argv[3];

    if (!recordType || !fieldName) {
        console.error('Please provide both recordType (transaction or license) and fieldName as command line arguments');
        process.exit(1);
    }

    if (recordType !== 'transaction' && recordType !== 'license') {
        console.error('recordType must be either "transaction" or "license"');
        process.exit(1);
    }

    try {
        await initializeDatabase();
        console.log('Database connection established');

        const ignoredFieldService = new IgnoredFieldService(AppDataSource);
        await ignoredFieldService.addIgnoredField(fieldName, recordType);
        console.log(`Successfully added ignored field: ${fieldName} for ${recordType} records`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

main();