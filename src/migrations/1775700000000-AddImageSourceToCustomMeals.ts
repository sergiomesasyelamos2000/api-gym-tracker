import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageSourceToCustomMeals1775700000000
  implements MigrationInterface
{
  name = 'AddImageSourceToCustomMeals1775700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "custom_meals"
      ADD COLUMN IF NOT EXISTS "imageSource" character varying(20)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "custom_meals"
      DROP COLUMN IF EXISTS "imageSource"
    `);
  }
}
