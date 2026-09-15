import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionHealthMetrics1775500000000
  implements MigrationInterface
{
  name = 'AddSessionHealthMetrics1775500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "routine_session_entity"
      ADD COLUMN IF NOT EXISTS "avgHeartRate" double precision NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "routine_session_entity"
      ADD COLUMN IF NOT EXISTS "maxHeartRate" double precision NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "routine_session_entity"
      ADD COLUMN IF NOT EXISTS "caloriesBurned" double precision NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "routine_session_entity"
      ADD COLUMN IF NOT EXISTS "healthMetricsSource" character varying NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "routine_session_entity"
      DROP COLUMN IF EXISTS "healthMetricsSource"
    `);
    await queryRunner.query(`
      ALTER TABLE "routine_session_entity"
      DROP COLUMN IF EXISTS "caloriesBurned"
    `);
    await queryRunner.query(`
      ALTER TABLE "routine_session_entity"
      DROP COLUMN IF EXISTS "maxHeartRate"
    `);
    await queryRunner.query(`
      ALTER TABLE "routine_session_entity"
      DROP COLUMN IF EXISTS "avgHeartRate"
    `);
  }
}
