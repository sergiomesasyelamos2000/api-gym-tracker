import {
  EquipmentEntity,
  ExerciseTypeEntity,
  MuscleEntity,
} from '@app/entity-data-models';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSeedService } from './equipment-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EquipmentEntity,
      MuscleEntity,
      ExerciseTypeEntity,
    ]),
  ],
  providers: [DataSeedService],
  exports: [DataSeedService],
})
export class PopulateModule {}
