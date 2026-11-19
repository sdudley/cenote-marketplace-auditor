import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddonForgePromoColumns1711234567899 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "addon"
            ADD COLUMN IF NOT EXISTS "forge_promo_start_date" date,
            ADD COLUMN IF NOT EXISTS "forge_promo_end_date" date;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "addon"
            DROP COLUMN IF EXISTS "forge_promo_end_date",
            DROP COLUMN IF EXISTS "forge_promo_start_date";
        `);
    }
}
