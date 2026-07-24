import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNutritionPlans1775200000000 implements MigrationInterface {
  name = 'AddNutritionPlans1775200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nutrition_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "status" character varying NOT NULL DEFAULT 'draft',
        "durationDays" integer NOT NULL,
        "planData" json NOT NULL,
        "macroSnapshot" json,
        "avgDailyCalories" numeric(8,2) NOT NULL,
        "avgDailyProtein" numeric(8,2) NOT NULL,
        "avgDailyCarbs" numeric(8,2) NOT NULL,
        "avgDailyFat" numeric(8,2) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_nutrition_plans" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_nutrition_plans_userId_status"
      ON "nutrition_plans" ("userId", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_nutrition_plans_userId_createdAt"
      ON "nutrition_plans" ("userId", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_nutrition_plans_userId_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_nutrition_plans_userId_status"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "nutrition_plans"`);
  }
}
