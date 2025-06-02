import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateExistingRecords1711234567891 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update all transaction records to match created_at
        await queryRunner.query(`
            UPDATE "transaction"
            SET "updated_at" = "created_at"
        `);

        // Update all license records to match created_at
        await queryRunner.query(`
            UPDATE "license"
            SET "updated_at" = "created_at"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No need to do anything in the down migration
        // The updated_at column will be dropped if the migration is rolled back
    }
}