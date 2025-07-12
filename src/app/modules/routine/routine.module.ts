import {
  ExerciseEntity,
  RoutineEntity,
  RoutineExerciseEntity,
  SetEntity,
} from '@app/entity-data-models';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutineController } from './routine.controller';
import { RoutineService } from './routine.service';

@Module({
  controllers: [RoutineController],
  providers: [RoutineService],
  imports: [
    TypeOrmModule.forFeature([
      RoutineEntity,
      RoutineExerciseEntity,
      ExerciseEntity,
      SetEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class RoutineModule {}
