import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1769466282208 implements MigrationInterface {
    name = 'Initial1769466282208'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying NOT NULL, "password" character varying, "picture" character varying, "googleId" character varying, "appleId" character varying, "refreshToken" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "routine_session_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "exercises" jsonb DEFAULT '[]', "totalTime" integer NOT NULL, "totalWeight" integer NOT NULL, "completedSets" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "routineId" uuid, CONSTRAINT "PK_2c64835e3d3289de03ab20e36d7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "routine_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "totalTime" integer NOT NULL DEFAULT '0', "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5c7025317377578906ed5da6201" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "equipment_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "image" text, CONSTRAINT "PK_5671e664ae956c44ed93f466cdc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "muscle_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "image" text, CONSTRAINT "PK_e49334faa57a573b671e586f091" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "exercise_type_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "image" text, CONSTRAINT "PK_499935be92d94442743623e4d7c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."food_entries_mealtype_enum" AS ENUM('breakfast', 'lunch', 'dinner', 'snack')`);
        await queryRunner.query(`CREATE TYPE "public"."food_entries_unit_enum" AS ENUM('gram', 'ml', 'portion', 'custom')`);
        await queryRunner.query(`CREATE TABLE "food_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "productCode" character varying NOT NULL, "productName" character varying NOT NULL, "productImage" character varying, "date" date NOT NULL, "mealType" "public"."food_entries_mealtype_enum" NOT NULL, "quantity" numeric(8,2) NOT NULL, "unit" "public"."food_entries_unit_enum" NOT NULL, "customUnitName" character varying, "customUnitGrams" numeric(8,2), "calories" numeric(8,2) NOT NULL, "protein" numeric(8,2) NOT NULL, "carbs" numeric(8,2) NOT NULL, "fat" numeric(8,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9ff4018d66bc4142ac2222a3ad0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."shopping_list_items_unit_enum" AS ENUM('gram', 'ml', 'portion', 'custom')`);
        await queryRunner.query(`CREATE TABLE "shopping_list_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "productCode" character varying NOT NULL, "productName" character varying NOT NULL, "productImage" character varying, "quantity" numeric(8,2) NOT NULL, "unit" "public"."shopping_list_items_unit_enum" NOT NULL, "customUnitName" character varying, "customUnitGrams" numeric(8,2), "purchased" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_043c112c02fdc1c39fbd619fadb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "favorite_products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "productCode" character varying NOT NULL, "productName" character varying NOT NULL, "productImage" character varying, "calories" numeric(8,2) NOT NULL, "protein" numeric(8,2) NOT NULL, "carbs" numeric(8,2) NOT NULL, "fat" numeric(8,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e772f2fcd37ace772a98430fa08" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "custom_products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "name" character varying NOT NULL, "description" text, "image" character varying, "brand" character varying, "caloriesPer100" numeric(8,2) NOT NULL, "proteinPer100" numeric(8,2) NOT NULL, "carbsPer100" numeric(8,2) NOT NULL, "fatPer100" numeric(8,2) NOT NULL, "fiberPer100" numeric(8,2), "sugarPer100" numeric(8,2), "sodiumPer100" numeric(8,2), "servingSize" numeric(8,2), "servingUnit" character varying, "barcode" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_eed912c2e523ece86f15428bb5f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "custom_meals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "name" character varying NOT NULL, "description" text, "image" character varying, "products" json NOT NULL, "totalCalories" numeric(8,2) NOT NULL, "totalProtein" numeric(8,2) NOT NULL, "totalCarbs" numeric(8,2) NOT NULL, "totalFat" numeric(8,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f38f7a8ec698c5bb9438b72c5aa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "exercise_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "imageUrl" character varying, "giftUrl" character varying, "equipments" text NOT NULL, "bodyParts" text NOT NULL, "targetMuscles" text NOT NULL, "secondaryMuscles" text, "instructions" text NOT NULL, "exerciseType" character varying, "videoUrl" character varying, "keywords" text, "overview" text, "exerciseTips" text, "variations" text, "relatedExerciseIds" text, CONSTRAINT "PK_f6c4c493fc24b05ffc6003ac3fc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."routine_exercise_entity_weightunit_enum" AS ENUM('kg', 'lbs')`);
        await queryRunner.query(`CREATE TYPE "public"."routine_exercise_entity_repstype_enum" AS ENUM('reps', 'range')`);
        await queryRunner.query(`CREATE TABLE "routine_exercise_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "notes" jsonb DEFAULT '[]', "restSeconds" character varying, "weightUnit" "public"."routine_exercise_entity_weightunit_enum" NOT NULL DEFAULT 'kg', "repsType" "public"."routine_exercise_entity_repstype_enum" NOT NULL DEFAULT 'reps', "order" integer NOT NULL DEFAULT '0', "supersetWith" character varying, "exerciseId" uuid, "routineId" uuid, CONSTRAINT "PK_b50bd37916cc1953126e6968e86" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order" integer NOT NULL, "weight" double precision, "reps" integer, "repsMin" integer, "repsMax" integer, "completed" boolean NOT NULL DEFAULT false, "weightUnit" character varying NOT NULL DEFAULT 'kg', "repsType" character varying NOT NULL DEFAULT 'reps', "routineExerciseId" uuid, CONSTRAINT "PK_5d15ed8b3e2a5cb6e9c9921d056" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."user_nutrition_profiles_gender_enum" AS ENUM('male', 'female', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."user_nutrition_profiles_activitylevel_enum" AS ENUM('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')`);
        await queryRunner.query(`CREATE TYPE "public"."user_nutrition_profiles_weightgoal_enum" AS ENUM('lose', 'maintain', 'gain')`);
        await queryRunner.query(`CREATE TYPE "public"."user_nutrition_profiles_weightunit_enum" AS ENUM('kg', 'lbs')`);
        await queryRunner.query(`CREATE TYPE "public"."user_nutrition_profiles_heightunit_enum" AS ENUM('cm', 'ft')`);
        await queryRunner.query(`CREATE TABLE "user_nutrition_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "weight" numeric(5,2) NOT NULL, "height" numeric(5,2) NOT NULL, "age" integer NOT NULL, "gender" "public"."user_nutrition_profiles_gender_enum" NOT NULL, "activityLevel" "public"."user_nutrition_profiles_activitylevel_enum" NOT NULL, "weightGoal" "public"."user_nutrition_profiles_weightgoal_enum" NOT NULL, "targetWeight" numeric(5,2) NOT NULL, "weeklyWeightChange" numeric(3,2) NOT NULL, "dailyCalories" integer NOT NULL, "proteinGrams" numeric(6,2) NOT NULL, "carbsGrams" numeric(6,2) NOT NULL, "fatGrams" numeric(6,2) NOT NULL, "weightUnit" "public"."user_nutrition_profiles_weightunit_enum" NOT NULL DEFAULT 'kg', "heightUnit" "public"."user_nutrition_profiles_heightunit_enum" NOT NULL DEFAULT 'cm', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_57b099549e2e4cd3f33a72bd459" UNIQUE ("userId"), CONSTRAINT "REL_57b099549e2e4cd3f33a72bd45" UNIQUE ("userId"), CONSTRAINT "PK_ef7b6c66c5f685c2f67c4c5cba4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "routine_session_entity" ADD CONSTRAINT "FK_b479568f8a3cb5ee69fb7a5f943" FOREIGN KEY ("routineId") REFERENCES "routine_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "routine_entity" ADD CONSTRAINT "FK_231af93c14eab9b726ae07fa6ab" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "food_entries" ADD CONSTRAINT "FK_20df2413919b31bced5d0eb5264" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "routine_exercise_entity" ADD CONSTRAINT "FK_9c256a7a0f32a394a27c90055e8" FOREIGN KEY ("exerciseId") REFERENCES "exercise_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "routine_exercise_entity" ADD CONSTRAINT "FK_1cbefc5176ebcba1efc63dd1673" FOREIGN KEY ("routineId") REFERENCES "routine_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sets" ADD CONSTRAINT "FK_b1ebe417b8359c22baffd84cb79" FOREIGN KEY ("routineExerciseId") REFERENCES "routine_exercise_entity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_nutrition_profiles" ADD CONSTRAINT "FK_57b099549e2e4cd3f33a72bd459" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_nutrition_profiles" DROP CONSTRAINT "FK_57b099549e2e4cd3f33a72bd459"`);
        await queryRunner.query(`ALTER TABLE "sets" DROP CONSTRAINT "FK_b1ebe417b8359c22baffd84cb79"`);
        await queryRunner.query(`ALTER TABLE "routine_exercise_entity" DROP CONSTRAINT "FK_1cbefc5176ebcba1efc63dd1673"`);
        await queryRunner.query(`ALTER TABLE "routine_exercise_entity" DROP CONSTRAINT "FK_9c256a7a0f32a394a27c90055e8"`);
        await queryRunner.query(`ALTER TABLE "food_entries" DROP CONSTRAINT "FK_20df2413919b31bced5d0eb5264"`);
        await queryRunner.query(`ALTER TABLE "routine_entity" DROP CONSTRAINT "FK_231af93c14eab9b726ae07fa6ab"`);
        await queryRunner.query(`ALTER TABLE "routine_session_entity" DROP CONSTRAINT "FK_b479568f8a3cb5ee69fb7a5f943"`);
        await queryRunner.query(`DROP TABLE "user_nutrition_profiles"`);
        await queryRunner.query(`DROP TYPE "public"."user_nutrition_profiles_heightunit_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_nutrition_profiles_weightunit_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_nutrition_profiles_weightgoal_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_nutrition_profiles_activitylevel_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_nutrition_profiles_gender_enum"`);
        await queryRunner.query(`DROP TABLE "sets"`);
        await queryRunner.query(`DROP TABLE "routine_exercise_entity"`);
        await queryRunner.query(`DROP TYPE "public"."routine_exercise_entity_repstype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."routine_exercise_entity_weightunit_enum"`);
        await queryRunner.query(`DROP TABLE "exercise_entity"`);
        await queryRunner.query(`DROP TABLE "custom_meals"`);
        await queryRunner.query(`DROP TABLE "custom_products"`);
        await queryRunner.query(`DROP TABLE "favorite_products"`);
        await queryRunner.query(`DROP TABLE "shopping_list_items"`);
        await queryRunner.query(`DROP TYPE "public"."shopping_list_items_unit_enum"`);
        await queryRunner.query(`DROP TABLE "food_entries"`);
        await queryRunner.query(`DROP TYPE "public"."food_entries_unit_enum"`);
        await queryRunner.query(`DROP TYPE "public"."food_entries_mealtype_enum"`);
        await queryRunner.query(`DROP TABLE "exercise_type_entity"`);
        await queryRunner.query(`DROP TABLE "muscle_entity"`);
        await queryRunner.query(`DROP TABLE "equipment_entity"`);
        await queryRunner.query(`DROP TABLE "routine_entity"`);
        await queryRunner.query(`DROP TABLE "routine_session_entity"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
