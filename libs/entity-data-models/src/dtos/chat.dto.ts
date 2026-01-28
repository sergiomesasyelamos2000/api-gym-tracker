import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ActivityLevel,
  Gender,
  WeightGoal,
} from '../entities/user-nutrition-profile.entity';

export class ChatMessageDto {
  @IsString()
  role!: 'user' | 'assistant' | 'system';

  @IsString()
  content!: string;
}

export class ChatRequestDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];

  @IsOptional()
  @IsString()
  userId?: string;
}

export class ChatResponseDto {
  @IsString()
  reply!: string;

  @IsString()
  provider!: string;

  @IsString()
  model!: string;
}

export interface UserContext {
  userId: string;
  profile: {
    age?: number;
    gender?: Gender;
    weight?: number;
    height?: number;
    activityLevel?: ActivityLevel;
    goals: {
      weightGoal?: WeightGoal;
      targetWeight?: number;
      dailyCalories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    };
  };
  training: {
    routines: {
      id: string;
      name: string;
      description?: string;
      exerciseCount: number;
    }[];
    recentSessions: {
      date: string;
      routineName: string;
      exercisesCompleted: number;
    }[];
    stats: {
      totalSessions: number;
      totalExercises: number;
      averageSessionsPerWeek: number;
      lastWorkoutDate?: string;
    };
    schedule: {
      frequentDays: string[];
      preferredTime: string;
    };
  };
}
