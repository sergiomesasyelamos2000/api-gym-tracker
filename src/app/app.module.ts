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
  SubscriptionEntity,
  UserEntity,
  UserNutritionProfileEntity,
} from '@app/entity-data-models';
import { CacheModule } from '@nestjs/cache-manager';
import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { AuthModule } from './modules/auth/auth.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { ExportController } from './controllers/export.controller';
import { ExportService } from './services/export.service';

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
    CacheModule.register({
      isGlobal: true,
      ttl: 300, // 5 minutes default TTL
      max: 100, // Maximum number of items in cache
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
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
          SubscriptionEntity,
          UserEntity,
        ],
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        // Connection pool configuration
        extra: {
          max: 100, // Maximum number of connections in pool (increased from 50)
          min: 20, // Minimum number of connections in pool (increased from 10)
          idleTimeoutMillis: 30000, // Close idle connections after 30s
          connectionTimeoutMillis: 10000, // Timeout for acquiring connection (increased from 5000)
          acquireTimeoutMillis: 30000, // Timeout for acquiring connection from pool
        },
        // Query logging
        logging:
          configService.get<string>('NODE_ENV') === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
        maxQueryExecutionTime: 1000, // Log queries taking > 1s
      }),
    }),
    ScheduleModule.forRoot(),
    ExercisesModule,
    RoutineModule,
    NutritionModule,
    PopulateModule,
    AuthModule,
    SubscriptionModule,
  ],
  controllers: [AppController, ExportController],
  providers: [AppService, ExportService],
})
export class AppModule implements OnApplicationBootstrap {
  constructor() {}

  async onApplicationBootstrap() {}
}
