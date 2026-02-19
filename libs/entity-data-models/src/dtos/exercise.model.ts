import { ExerciseNote } from './shared-types';
import { SetRequestDto } from './set.model';
import { IsArray, IsOptional, IsString } from 'class-validator';

export interface ExerciseRequestDto {
  id: string;
  name: string;
  muscularGroup?: string;
  imageUrl?: string;
  giftUrl?: string;
  notes?: ExerciseNote[];
  restSeconds?: string;
  sets?: SetRequestDto[];
  weightUnit: 'kg' | 'lbs';
  repsType: 'reps' | 'range';
  order?: number;
  supersetWith?: string;
}

// DTO for exercise details from local database
export interface ExerciseDetailDto {
  id: string;
  name: string;
  equipmentId?: string;
  primaryMuscleId?: string;
  typeId?: string;
  image?: string;
  instructions?: string[];
  secondaryMuscleIds?: string[];
  weightUnit: 'kg' | 'lbs';
  repsType: 'reps' | 'range';
}

export class ExerciseResponseDto {
  id: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
  imageUrl?: string;
  exerciseType?: string;
  videoUrl?: string;
  order?: number;
  supersetWith?: string;
}

export class EquipmentDto {
  id: string;
  name: string;
  image?: string;
}

export class MuscleDto {
  id: string;
  name: string;
  image?: string;
}

export class ExerciseTypeDto {
  id: string;
  name: string;
  image?: string;
}

export class CreateExerciseDto {
  @IsString()
  name: string;

  @IsString()
  equipment: string;

  @IsString()
  primaryMuscle: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  otherMuscles?: string[];

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  imageBase64?: string;
}
