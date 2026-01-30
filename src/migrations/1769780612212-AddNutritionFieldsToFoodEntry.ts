import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNutritionFieldsToFoodEntry1769780612212 implements MigrationInterface {
    name = 'AddNutritionFieldsToFoodEntry1769780612212'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "food_entries" ADD "sugar" numeric(8,2)`);
        await queryRunner.query(`ALTER TABLE "food_entries" ADD "fiber" numeric(8,2)`);
        await queryRunner.query(`ALTER TABLE "food_entries" ADD "sodium" numeric(8,2)`);
        await queryRunner.query(`ALTER TABLE "custom_meals" ADD "totalSugar" numeric(8,2)`);
        await queryRunner.query(`ALTER TABLE "custom_meals" ADD "totalFiber" numeric(8,2)`);
        await queryRunner.query(`ALTER TABLE "custom_meals" ADD "totalSodium" numeric(8,2)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "custom_meals" DROP COLUMN "totalSodium"`);
        await queryRunner.query(`ALTER TABLE "custom_meals" DROP COLUMN "totalFiber"`);
        await queryRunner.query(`ALTER TABLE "custom_meals" DROP COLUMN "totalSugar"`);
        await queryRunner.query(`ALTER TABLE "food_entries" DROP COLUMN "sodium"`);
        await queryRunner.query(`ALTER TABLE "food_entries" DROP COLUMN "fiber"`);
        await queryRunner.query(`ALTER TABLE "food_entries" DROP COLUMN "sugar"`);
    }

}
