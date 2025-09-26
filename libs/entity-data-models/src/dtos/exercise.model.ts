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
}
