/* eslint-disable prettier/prettier */
import {
  CustomMealEntity,
  CustomProductEntity,
  EquipmentEntity,
  ExerciseEntity,
  ExerciseTypeEntity,
  FavoriteProductEntity,
  FoodEntryEntity,
  MuscleEntity,
  RoutineEntity,
  RoutineExerciseEntity,
  RoutineSessionEntity,
  SetEntity,
  ShoppingListItemEntity,
  UserNutritionProfileEntity,
} from '@app/entity-data-models';
import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { RoutineModule } from './modules/routine/routine.module';
import { PopulateModule } from './services/populate.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // Ruta al archivo .env
      cache: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/public',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'gym_db',
      entities: [
        RoutineEntity,
        ExerciseEntity,
        SetEntity,
        RoutineExerciseEntity,
        RoutineSessionEntity,
        EquipmentEntity,
        MuscleEntity,
        ExerciseTypeEntity,
        UserNutritionProfileEntity,
        FoodEntryEntity,
        ShoppingListItemEntity,
        FavoriteProductEntity,
        CustomProductEntity,
        CustomMealEntity,
      ],
      synchronize: true,
    }),
    ScheduleModule.forRoot(),
    ExercisesModule,
    RoutineModule,
    NutritionModule,
    PopulateModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnApplicationBootstrap {
  constructor() {}

  async onApplicationBootstrap() {}
}
