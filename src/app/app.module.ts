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
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const databaseSsl =
          configService.get<string>('DATABASE_SSL', isProduction ? 'true' : 'false') ===
          'true';

        const maxConnections = Number(
          configService.get<string>('DATABASE_POOL_MAX', isProduction ? '10' : '20'),
        );
        const minConnections = Number(
          configService.get<string>('DATABASE_POOL_MIN', isProduction ? '0' : '5'),
        );

        const connectionOptions = databaseUrl
          ? { url: databaseUrl }
          : {
              host: configService.get<string>('DATABASE_HOST', 'localhost'),
              port: configService.get<number>('DATABASE_PORT', 5432),
              username: configService.getOrThrow<string>('DATABASE_USER'),
              password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
              database: configService.getOrThrow<string>('DATABASE_NAME'),
            };

        return {
          type: 'postgres',
          ...connectionOptions,
          ssl: databaseSsl ? { rejectUnauthorized: false } : false,
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
          synchronize: !isProduction,
          extra: {
            max: maxConnections,
            min: minConnections,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            acquireTimeoutMillis: 30000,
          },
          logging: isProduction ? ['error'] : ['query', 'error', 'warn'],
          maxQueryExecutionTime: 1000,
        };
      },
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
