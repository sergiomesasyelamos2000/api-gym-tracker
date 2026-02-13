import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiChatUsageCountToUsers1771000000000
  implements MigrationInterface
{
  name = 'AddAiChatUsageCountToUsers1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aiChatUsageCount" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "aiChatUsageCount"`,
    );
  }
}
