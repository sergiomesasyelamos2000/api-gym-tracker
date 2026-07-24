import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNutritionPlanUserCascade1775300000000
  implements MigrationInterface
{
  name = 'AddNutritionPlanUserCascade1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove orphan plans before tightening the column/FK
    await queryRunner.query(`
      DELETE FROM "nutrition_plans" np
      WHERE NOT EXISTS (
        SELECT 1 FROM "users" u WHERE u."id"::text = np."userId"
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "nutrition_plans"
      ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_nutrition_plans_userId'
        ) THEN
          ALTER TABLE "nutrition_plans"
          ADD CONSTRAINT "FK_nutrition_plans_userId"
          FOREIGN KEY ("userId")
          REFERENCES "users"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nutrition_plans"
      DROP CONSTRAINT IF EXISTS "FK_nutrition_plans_userId"
    `);

    await queryRunner.query(`
      ALTER TABLE "nutrition_plans"
      ALTER COLUMN "userId" TYPE character varying USING "userId"::text
    `);
  }
}
