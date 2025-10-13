export class RoutineSessionRequestDto {
  routineId!: string;
  totalTime!: number;
  totalWeight!: number;
  completedSets!: number;
  exercises?: {
    exerciseId: string;
    exerciseName: string;
    totalWeight: number;
    totalReps: number;
    sets: { weight: number; reps: number; completed: boolean }[];
  }[];
}
