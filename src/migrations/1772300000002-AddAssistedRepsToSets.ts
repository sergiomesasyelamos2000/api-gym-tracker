import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssistedRepsToSets1772300000002 implements MigrationInterface {
  name = 'AddAssistedRepsToSets1772300000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sets"
      ADD COLUMN IF NOT EXISTS "assistedReps" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sets"
      DROP COLUMN IF EXISTS "assistedReps"
    `);
  }
}
