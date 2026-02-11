import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptions1739230800000 implements MigrationInterface {
  name = 'AddSubscriptions1739230800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "public"."subscriptions_plan_enum" AS ENUM('free', 'monthly', 'yearly', 'lifetime')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."subscriptions_status_enum" AS ENUM('active', 'canceled', 'expired', 'past_due', 'incomplete', 'trial')
    `);

    // Create subscriptions table
    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "stripeCustomerId" character varying,
        "stripeSubscriptionId" character varying,
        "plan" "public"."subscriptions_plan_enum" NOT NULL DEFAULT 'free',
        "status" "public"."subscriptions_status_enum" NOT NULL DEFAULT 'active',
        "currentPeriodStart" TIMESTAMP NOT NULL DEFAULT now(),
        "currentPeriodEnd" TIMESTAMP,
        "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false,
        "canceledAt" TIMESTAMP,
        "trialEnd" TIMESTAMP,
        "price" numeric(10,2) NOT NULL DEFAULT 0,
        "currency" character varying(3) NOT NULL DEFAULT 'usd',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_subscriptions_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_subscriptions_id" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_subscriptions_userId" ON "subscriptions" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_subscriptions_stripeCustomerId" ON "subscriptions" ("stripeCustomerId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_subscriptions_status" ON "subscriptions" ("status")
    `);

    // Create foreign key to users table
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD CONSTRAINT "FK_subscriptions_userId"
      FOREIGN KEY ("userId")
      REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    // Seed: Create free subscription for all existing users
    await queryRunner.query(`
      INSERT INTO "subscriptions" ("userId", "plan", "status", "price", "currency")
      SELECT id, 'free', 'active', 0, 'usd'
      FROM "users"
      WHERE id NOT IN (SELECT "userId" FROM "subscriptions")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.query(`
      ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_subscriptions_userId"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_subscriptions_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_subscriptions_stripeCustomerId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_subscriptions_userId"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "subscriptions"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "public"."subscriptions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."subscriptions_plan_enum"`);
  }
}
