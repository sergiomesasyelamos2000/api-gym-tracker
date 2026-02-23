import { IsNumber, IsString, IsArray, IsOptional } from 'class-validator';

export class RoutineSessionRequestDto {
  @IsOptional()
  @IsString()
  routineId?: string;

  @IsNumber()
  totalTime!: number;

  @IsNumber()
  totalWeight!: number;

  @IsNumber()
  completedSets!: number;

  @IsOptional()
  @IsArray()
  exercises?: {
    exerciseId: string;
    exerciseName: string;
    totalWeight: number;
    totalReps: number;
    sets: {
      weight: number;
      reps: number;
      completed: boolean;
      isRecord?: boolean;
      setType?: 'warmup' | 'normal' | 'failed' | 'drop';
    }[];
  }[];
}
