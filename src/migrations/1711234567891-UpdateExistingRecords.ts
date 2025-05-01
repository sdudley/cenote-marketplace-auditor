import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateExistingRecords1711234567891 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update all transaction records to match createdAt
        await queryRunner.query(`
            UPDATE "transaction"
            SET "updatedAt" = "createdAt"
        `);

        // Update all license records to match createdAt
        await queryRunner.query(`
            UPDATE "license"
            SET "updatedAt" = "createdAt"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No need to do anything in the down migration
        // The updatedAt column will be dropped if the migration is rolled back
    }
}