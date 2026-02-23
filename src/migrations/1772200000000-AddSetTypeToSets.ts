import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSetTypeToSets1772200000000 implements MigrationInterface {
  name = 'AddSetTypeToSets1772200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sets" ADD COLUMN IF NOT EXISTS "setType" character varying NOT NULL DEFAULT 'normal'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sets" DROP COLUMN IF EXISTS "setType"`);
  }
}
