import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetFieldsToUsers1771000000001
  implements MigrationInterface
{
  name = 'AddPasswordResetFieldsToUsers1771000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetPasswordTokenHash" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetPasswordTokenExpiresAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "resetPasswordTokenExpiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "resetPasswordTokenHash"`,
    );
  }
}
