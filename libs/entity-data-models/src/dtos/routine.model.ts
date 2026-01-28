import { ExerciseRequestDto, ExerciseResponseDto } from './exercise.model';

export interface RoutineRequestDto {
  title: string;
  createdAt: Date;
  updatedAt?: Date;
  exercises: ExerciseRequestDto[];
}

export interface SetResponseDto {
  id: string;
  order: number;
  weight: number;
  reps: number;
  repsMin?: number;
  repsMax?: number;
  completed?: boolean;
  weightUnit?: 'kg' | 'lbs';
  repsType?: 'reps' | 'range';
}

export interface RoutineExerciseNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface RoutineExerciseResponseDto {
  id: string;
  exercise: ExerciseResponseDto;
  sets: SetResponseDto[];
  notes?: RoutineExerciseNote[];
  restSeconds?: string;
  weightUnit: 'kg' | 'lbs';
  repsType: 'reps' | 'range';
  order: number;
  supersetWith?: string | null;
}

export interface RoutineResponseDto {
  id: string;
  title: string;
  description?: string;
  totalSets: number;
  totalExercises: number;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  routineExercises: RoutineExerciseResponseDto[];
  userId?: string;
  category?: string;
  difficulty?: string;
  estimatedDuration?: number;
  lastCompleted?: Date;
  completionCount?: number;
}
