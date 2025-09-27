import {
  EquipmentEntity,
  ExerciseEntity,
  ExerciseTypeEntity,
  MuscleEntity,
} from '@app/entity-data-models';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExercisesService } from './exercises.service';
import { ExercisesController } from './exercises.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10 s
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([
      ExerciseEntity,
      EquipmentEntity,
      MuscleEntity,
      ExerciseTypeEntity,
    ]),
  ],
  providers: [ExercisesService],
  exports: [TypeOrmModule],
  controllers: [ExercisesController],
})
export class ExercisesModule {}
