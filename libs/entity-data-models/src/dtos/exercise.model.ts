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
