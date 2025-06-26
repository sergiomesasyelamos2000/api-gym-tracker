import { ExerciseRequestDto } from './exercise.model';

export interface RoutineRequestDto {
  title: string;
  totalTime?: number;
  totalWeight?: number;
  completedSets?: number;
  createdAt: Date;
  updatedAt?: Date;
  exercises: ExerciseRequestDto[];
}
