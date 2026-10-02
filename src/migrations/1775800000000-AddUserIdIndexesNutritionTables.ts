import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdIndexesNutritionTables1775800000000
  implements MigrationInterface
{
  name = 'AddUserIdIndexesNutritionTables1775800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_favorite_products_userId" ON "favorite_products" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_shopping_list_items_userId" ON "shopping_list_items" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_meals_userId" ON "custom_meals" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_meals_userId_createdAt" ON "custom_meals" ("userId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_products_userId" ON "custom_products" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_custom_products_userId_createdAt" ON "custom_products" ("userId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_custom_products_userId_createdAt"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_custom_products_userId"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_custom_meals_userId_createdAt"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_custom_meals_userId"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_shopping_list_items_userId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_favorite_products_userId"`,
    );
  }
}
