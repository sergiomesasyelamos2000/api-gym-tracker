import { ExerciseEntity } from '@app/entity-data-models';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExercisesService } from './exercises.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExerciseEntity])],
  providers: [ExercisesService],
  exports: [TypeOrmModule],
})
export class ExercisesModule {}
