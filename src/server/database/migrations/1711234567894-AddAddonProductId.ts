import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddonProductId1711234567894 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "addon"
            ADD COLUMN IF NOT EXISTS "product_id" character varying;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "addon"
            DROP COLUMN IF EXISTS "product_id";
        `);
    }
}
