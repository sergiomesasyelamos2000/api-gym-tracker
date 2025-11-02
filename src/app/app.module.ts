/* eslint-disable prettier/prettier */
import {
  EquipmentEntity,
  ExerciseEntity,
  ExerciseTypeEntity,
  MuscleEntity,
  RoutineEntity,
  RoutineExerciseEntity,
  RoutineSessionEntity,
  SetEntity,
  UserEntity,
} from '@app/entity-data-models';
import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { RoutineModule } from './modules/routine/routine.module';
import { DataSeedService } from './services/equipment-seed.service';
import { PopulateModule } from './services/populate.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // así puedes usarlo en toda la app sin importarlo en cada módulo
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
        UserEntity,
      ],
      synchronize: true,
    }),
    ScheduleModule.forRoot(),
    ExercisesModule,
    RoutineModule,
    NutritionModule,
    PopulateModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private readonly equipmentSeed: DataSeedService) {}

  async onApplicationBootstrap() {
    await this.equipmentSeed.run();
  }
}
