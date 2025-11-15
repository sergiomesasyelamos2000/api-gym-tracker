import {
  EquipmentEntity,
  ExerciseTypeEntity,
  MuscleEntity,
} from '@app/entity-data-models';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EquipmentEntity,
      MuscleEntity,
      ExerciseTypeEntity,
    ]),
  ],
  providers: [],
  exports: [],
})
export class PopulateModule {}
