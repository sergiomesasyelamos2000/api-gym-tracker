import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppleIapFieldsToSubscriptions1775100000000
  implements MigrationInterface
{
  name = 'AddAppleIapFieldsToSubscriptions1775100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD "billingProvider" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD "appleOriginalTransactionId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD "appleTransactionId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD "appleProductId" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_billingProvider" ON "subscriptions" ("billingProvider") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_appleOriginalTransactionId" ON "subscriptions" ("appleOriginalTransactionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_appleTransactionId" ON "subscriptions" ("appleTransactionId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_subscriptions_appleTransactionId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_subscriptions_appleOriginalTransactionId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_subscriptions_billingProvider"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN "appleProductId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN "appleTransactionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN "appleOriginalTransactionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN "billingProvider"`,
    );
  }
}
