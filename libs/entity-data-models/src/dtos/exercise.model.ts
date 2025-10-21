import { SetRequestDto } from './set.model';

export interface ExerciseRequestDto {
  id: string;
  title: string;
  muscularGroup?: string;
  photoUrl?: string;
  notes?: string;
  restSeconds?: string;
  sets?: SetRequestDto[];
  weightUnit: 'kg' | 'lbs';
  repsType: 'reps' | 'range';
  order?: number;
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
}

export class EquipmentDto {
  name: string;
  image?: string;
}

export class CreateExerciseDto {
  name: string;
  equipment: string;
  primaryMuscle: string;
  otherMuscles?: string[];
  type?: string;
  imageBase64?: string;
}
