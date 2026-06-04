import { MigrationInterface, QueryRunner } from "typeorm";

// When updating the default list of ignored fields, we must also update the README.md file

const DEFAULT_IGNORED_FIELDS: Array<{ fieldName: string; recordType: 'license' | 'transaction' }> = [
    { fieldName: 'lastUpdated', recordType: 'license' },
    { fieldName: 'lastUpdated', recordType: 'transaction' },
    { fieldName: 'purchaseDetails.parentProductEdition', recordType: 'transaction' },
    { fieldName: 'purchaseDetails.parentProductName', recordType: 'transaction' },
    { fieldName: 'purchaseDetails.changeInParentProductEdition', recordType: 'transaction' },
    { fieldName: 'purchaseDetails.oldParentProductEdition', recordType: 'transaction' },
];

export class InitializeIgnoredFields1711234567892 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasRecords = await queryRunner.query('SELECT COUNT(*)::int AS count FROM ignored_field');
        if (hasRecords[0].count > 0) {
            console.log('IgnoredField table already has records. Skipping initialization.');
            return;
        }

        console.log('Initializing license and transaction ignored fields...');
        for (const { fieldName, recordType } of DEFAULT_IGNORED_FIELDS) {
            await queryRunner.query(
                `INSERT INTO ignored_field (field_name, record_type) VALUES ($1, $2)`,
                [fieldName, recordType]
            );
            console.log(`Added ${recordType} ignored field: ${fieldName}`);
        }

        console.log('Successfully initialized all ignored fields');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove all initialized fields
        await queryRunner.query('DELETE FROM ignored_field');
    }
}