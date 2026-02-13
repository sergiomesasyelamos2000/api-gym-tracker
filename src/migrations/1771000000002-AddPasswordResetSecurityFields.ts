import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetSecurityFields1771000000002
  implements MigrationInterface
{
  name = 'AddPasswordResetSecurityFields1771000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetPasswordAttempts" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetPasswordRequestedAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "resetPasswordRequestedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "resetPasswordAttempts"`,
    );
  }
}
