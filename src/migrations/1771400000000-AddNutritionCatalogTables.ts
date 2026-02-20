import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNutritionCatalogTables1771400000000
  implements MigrationInterface
{
  name = 'AddNutritionCatalogTables1771400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nutrition_products_master" (
        "id" BIGSERIAL PRIMARY KEY,
        "canonical_name" TEXT NOT NULL,
        "canonical_brand" TEXT,
        "barcode_gtin" VARCHAR(64),
        "serving_size" TEXT,
        "image_url" TEXT,
        "quality_score" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_nutrition_products_master_barcode_unique"
      ON "nutrition_products_master" ("barcode_gtin")
      WHERE "barcode_gtin" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_nutrition_products_master_name_trgm"
      ON "nutrition_products_master"
      USING gin ("canonical_name" gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nutrition_product_nutrients_per_100g" (
        "product_id" BIGINT PRIMARY KEY REFERENCES "nutrition_products_master"("id") ON DELETE CASCADE,
        "calories" NUMERIC(10,2) NOT NULL DEFAULT 0,
        "protein" NUMERIC(10,2) NOT NULL DEFAULT 0,
        "carbs" NUMERIC(10,2) NOT NULL DEFAULT 0,
        "fat" NUMERIC(10,2) NOT NULL DEFAULT 0,
        "fiber" NUMERIC(10,2),
        "sugar" NUMERIC(10,2),
        "sodium" NUMERIC(10,2),
        "saturated_fat" NUMERIC(10,2),
        "raw_json" JSONB
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nutrition_product_sources" (
        "id" BIGSERIAL PRIMARY KEY,
        "product_id" BIGINT NOT NULL REFERENCES "nutrition_products_master"("id") ON DELETE CASCADE,
        "source" VARCHAR(32) NOT NULL,
        "source_product_id" TEXT NOT NULL,
        "license_tag" VARCHAR(32),
        "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "payload_hash" TEXT,
        "raw_payload" JSONB
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_nutrition_product_sources_unique"
      ON "nutrition_product_sources" ("source", "source_product_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_nutrition_product_sources_unique"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "nutrition_product_sources"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "nutrition_product_nutrients_per_100g"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_nutrition_products_master_name_trgm"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_nutrition_products_master_barcode_unique"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "nutrition_products_master"`);
  }
}

