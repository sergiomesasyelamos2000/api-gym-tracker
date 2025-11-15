import { SetRequestDto } from './set.model';

export interface ExerciseNote {
  id: string;
  text: string;
  createdAt: string;
}

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
