import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGinIndexes1711234567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add GIN indexes for transactions
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_transaction_data_gin" ON "transaction" USING GIN ("data");
            CREATE INDEX IF NOT EXISTS "IDX_transaction_version_data_gin" ON "transaction_version" USING GIN ("data");
        `);

        // Add GIN indexes for licenses
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_license_data_gin" ON "license" USING GIN ("data");
            CREATE INDEX IF NOT EXISTS "IDX_license_version_data_gin" ON "license_version" USING GIN ("data");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove GIN indexes for transactions
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_transaction_data_gin";
            DROP INDEX IF EXISTS "IDX_transaction_version_data_gin";
        `);

        // Remove GIN indexes for licenses
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_license_data_gin";
            DROP INDEX IF EXISTS "IDX_license_version_data_gin";
        `);
    }
}