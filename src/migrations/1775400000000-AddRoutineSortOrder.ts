import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoutineSortOrder1775400000000 implements MigrationInterface {
  name = 'AddRoutineSortOrder1775400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "routine_entity"
      ADD COLUMN IF NOT EXISTS "sortOrder" integer NOT NULL DEFAULT 0
    `);

    // Preserve current list order (newest first) as sortOrder 0..n-1 per user.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          "id",
          ROW_NUMBER() OVER (
            PARTITION BY "userId"
            ORDER BY "createdAt" DESC
          ) - 1 AS "newSortOrder"
        FROM "routine_entity"
      )
      UPDATE "routine_entity" AS r
      SET "sortOrder" = ranked."newSortOrder"
      FROM ranked
      WHERE r."id" = ranked."id"
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_routine_entity_userId_sortOrder"
      ON "routine_entity" ("userId", "sortOrder")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_routine_entity_userId_sortOrder"
    `);

    await queryRunner.query(`
      ALTER TABLE "routine_entity"
      DROP COLUMN IF EXISTS "sortOrder"
    `);
  }
}
