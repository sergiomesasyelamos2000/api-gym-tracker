import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1769466282209 implements MigrationInterface {
  name = 'AddPerformanceIndexes1769466282209';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // RoutineEntity indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_routine_entity_userId" ON "routine_entity" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_routine_entity_userId_createdAt" ON "routine_entity" ("userId", "createdAt")`,
    );

    // RoutineSessionEntity indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_routine_session_entity_routineId_createdAt" ON "routine_session_entity" ("routineId", "createdAt")`,
    );

    // FoodEntryEntity indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_food_entries_userId_date" ON "food_entries" ("userId", "date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_food_entries_userId_date_mealType" ON "food_entries" ("userId", "date", "mealType")`,
    );

    // UserEntity indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_users_googleId" ON "users" ("googleId") WHERE "googleId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_appleId" ON "users" ("appleId") WHERE "appleId" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes in reverse order
    await queryRunner.query(`DROP INDEX "IDX_users_appleId"`);
    await queryRunner.query(`DROP INDEX "IDX_users_googleId"`);
    await queryRunner.query(
      `DROP INDEX "IDX_food_entries_userId_date_mealType"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_food_entries_userId_date"`);
    await queryRunner.query(
      `DROP INDEX "IDX_routine_session_entity_routineId_createdAt"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_routine_entity_userId_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_routine_entity_userId"`);
  }
}
