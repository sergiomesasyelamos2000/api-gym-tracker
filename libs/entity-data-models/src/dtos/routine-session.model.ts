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
  @IsNumber()
  avgHeartRate?: number | null;

  @IsOptional()
  @IsNumber()
  maxHeartRate?: number | null;

  @IsOptional()
  @IsNumber()
  caloriesBurned?: number | null;

  @IsOptional()
  @IsString()
  healthMetricsSource?: string | null;

  @IsOptional()
  @IsArray()
  exercises?: {
    exerciseId: string;
    exerciseName?: string;
    name?: string;
    imageUrl?: string;
    giftUrl?: string;
    restSeconds?: string;
    totalWeight?: number;
    totalReps?: number;
    sets: {
      weight: number;
      reps: number;
      completed: boolean;
      isRecord?: boolean;
      setType?: 'warmup' | 'normal' | 'failed' | 'drop';
    }[];
  }[];
}
