import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoutineFolders1775600000000 implements MigrationInterface {
  name = 'AddRoutineFolders1775600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "routine_folder_entity" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_routine_folder_entity" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_routine_folder_entity_userId"
      ON "routine_folder_entity" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_routine_folder_entity_userId_sortOrder"
      ON "routine_folder_entity" ("userId", "sortOrder")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_routine_folder_entity_userId'
        ) THEN
          ALTER TABLE "routine_folder_entity"
          ADD CONSTRAINT "FK_routine_folder_entity_userId"
          FOREIGN KEY ("userId") REFERENCES "users"("id")
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "routine_entity"
      ADD COLUMN IF NOT EXISTS "folderId" uuid NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_routine_entity_userId_folderId_sortOrder"
      ON "routine_entity" ("userId", "folderId", "sortOrder")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_routine_entity_folderId'
        ) THEN
          ALTER TABLE "routine_entity"
          ADD CONSTRAINT "FK_routine_entity_folderId"
          FOREIGN KEY ("folderId") REFERENCES "routine_folder_entity"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "routine_entity"
      DROP CONSTRAINT IF EXISTS "FK_routine_entity_folderId"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_routine_entity_userId_folderId_sortOrder"
    `);
    await queryRunner.query(`
      ALTER TABLE "routine_entity"
      DROP COLUMN IF EXISTS "folderId"
    `);
    await queryRunner.query(`
      ALTER TABLE "routine_folder_entity"
      DROP CONSTRAINT IF EXISTS "FK_routine_folder_entity_userId"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_routine_folder_entity_userId_sortOrder"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_routine_folder_entity_userId"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "routine_folder_entity"`);
  }
}
