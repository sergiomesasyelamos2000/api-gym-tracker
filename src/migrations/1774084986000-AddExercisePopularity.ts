import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExercisePopularity1774084986000 implements MigrationInterface {
  name = 'AddExercisePopularity1774084986000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exercise_entity" ADD "popularity" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exercise_entity" DROP COLUMN "popularity"`,
    );
  }
}
