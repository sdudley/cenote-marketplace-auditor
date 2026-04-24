import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAddonForgeColumns1711234567893 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "addon"
            ADD COLUMN IF NOT EXISTS "forge_migration_date" date,
            ADD COLUMN IF NOT EXISTS "forge_release_date" date,
            ADD COLUMN IF NOT EXISTS "always_forge" boolean NOT NULL DEFAULT false;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "addon"
            DROP COLUMN IF EXISTS "always_forge",
            DROP COLUMN IF EXISTS "forge_release_date",
            DROP COLUMN IF EXISTS "forge_migration_date";
        `);
    }
}
