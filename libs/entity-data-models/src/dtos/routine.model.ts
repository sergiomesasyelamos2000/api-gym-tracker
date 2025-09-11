import { ExerciseRequestDto } from './exercise.model';

export interface RoutineRequestDto {
  title: string;
  createdAt: Date;
  updatedAt?: Date;
  exercises: ExerciseRequestDto[];
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
  routineExercises: any[];
  userId?: string;
  category?: string;
  difficulty?: string;
  estimatedDuration?: number;
  lastCompleted?: Date;
  completionCount?: number;
}
