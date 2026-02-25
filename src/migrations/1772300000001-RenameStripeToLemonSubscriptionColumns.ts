import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameStripeToLemonSubscriptionColumns1772300000001
  implements MigrationInterface
{
  name = 'RenameStripeToLemonSubscriptionColumns1772300000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'subscriptions'
            AND column_name = 'stripeCustomerId'
        ) THEN
          ALTER TABLE "subscriptions"
            RENAME COLUMN "stripeCustomerId" TO "lemonCustomerId";
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'subscriptions'
            AND column_name = 'stripeSubscriptionId'
        ) THEN
          ALTER TABLE "subscriptions"
            RENAME COLUMN "stripeSubscriptionId" TO "lemonSubscriptionId";
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subscriptions_stripeCustomerId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_a48bd9e263c2a972787a60169b"`);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_subscriptions_lemonCustomerId"
      ON "subscriptions" ("lemonCustomerId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_subscriptions_lemonSubscriptionId"
      ON "subscriptions" ("lemonSubscriptionId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subscriptions_lemonSubscriptionId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subscriptions_lemonCustomerId"`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'subscriptions'
            AND column_name = 'lemonSubscriptionId'
        ) THEN
          ALTER TABLE "subscriptions"
            RENAME COLUMN "lemonSubscriptionId" TO "stripeSubscriptionId";
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'subscriptions'
            AND column_name = 'lemonCustomerId'
        ) THEN
          ALTER TABLE "subscriptions"
            RENAME COLUMN "lemonCustomerId" TO "stripeCustomerId";
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_subscriptions_stripeCustomerId"
      ON "subscriptions" ("stripeCustomerId")
    `);
  }
}
