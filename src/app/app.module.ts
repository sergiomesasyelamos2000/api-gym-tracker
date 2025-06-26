import {
  ExerciseEntity,
  RoutineEntity,
  RoutineExerciseEntity,
  SetEntity,
} from '@app/entity-data-models';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { RoutineModule } from './modules/routine/routine.module';

@Module({
  imports: [
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
      ],
      synchronize: true,
    }),
    ExercisesModule,
    RoutineModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
