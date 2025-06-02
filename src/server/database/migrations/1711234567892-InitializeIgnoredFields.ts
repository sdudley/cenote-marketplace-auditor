import { MigrationInterface, QueryRunner } from "typeorm";
import { IgnoredField } from "../../../common/entities/IgnoredField";

// When updating the default list of ignored fields, we must also update the README.md file

export class InitializeIgnoredFields1711234567892 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if there are any existing records
        const hasRecords = await queryRunner.query('SELECT COUNT(*) FROM ignored_field');
        if (hasRecords[0].count > 0) {
            console.log('IgnoredField table already has records. Skipping initialization.');
            return;
        }

        // Initialize license ignored fields
        console.log('Initializing license ignored fields...');
        const licenseField = new IgnoredField();
        licenseField.fieldName = 'lastUpdated';
        licenseField.recordType = 'license';
        await queryRunner.manager.save(licenseField);
        console.log('Added license ignored field: lastUpdated');

        // Initialize transaction ignored fields
        console.log('Initializing transaction ignored fields...');
        const transactionFields = [
            'lastUpdated',
            'purchaseDetails.parentProductEdition',
            'purchaseDetails.parentProductName',
            'purchaseDetails.changeInParentProductEdition',
            'purchaseDetails.oldParentProductEdition',

        ];

        for (const fieldName of transactionFields) {
            const field = new IgnoredField();
            field.fieldName = fieldName;
            field.recordType = 'transaction';
            await queryRunner.manager.save(field);
            console.log(`Added transaction ignored field: ${fieldName}`);
        }

        console.log('Successfully initialized all ignored fields');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove all initialized fields
        await queryRunner.query('DELETE FROM ignored_field');
    }
}