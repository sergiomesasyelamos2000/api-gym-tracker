import { ExerciseEntity } from '@app/entity-data-models';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExercisesService } from './exercises.service';
import { ExercisesController } from './exercises.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExerciseEntity])],
  providers: [ExercisesService],
  exports: [TypeOrmModule],
  controllers: [ExercisesController],
})
export class ExercisesModule {}
