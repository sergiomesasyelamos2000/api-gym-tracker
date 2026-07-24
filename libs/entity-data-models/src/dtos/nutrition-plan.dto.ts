import { MealType, NutritionPlanStatus } from './shared-types';

export type { NutritionPlanStatus };

export interface NutritionPlanMacroTotalsDto {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionPlanFoodItemDto {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes?: string;
}

export interface NutritionPlanMealDto {
  mealType: MealType;
  name: string;
  foods: NutritionPlanFoodItemDto[];
  totals: NutritionPlanMacroTotalsDto;
  instructions?: string;
}

export interface NutritionPlanDayDto {
  dayIndex: number;
  label: string;
  isTrainingDay: boolean;
  meals: NutritionPlanMealDto[];
  dailyTotals: NutritionPlanMacroTotalsDto;
}

export interface NutritionPlanMacroSnapshotDto {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionPlanAiMetadataDto {
  provider: 'gemini' | 'groq';
  model: string;
  generatedAt: string;
  promptVersion: string;
}

export interface NutritionPlanDataDto {
  version: 1;
  dailyTargets: NutritionPlanMacroTotalsDto;
  days: NutritionPlanDayDto[];
  ai?: NutritionPlanAiMetadataDto;
}

export interface GenerateNutritionPlanDto {
  userId: string;
  durationDays?: number;
  name?: string;
  preferences?: {
    dietaryRestrictions?: string;
    excludedFoods?: string;
    additionalNotes?: string;
  };
}

export interface CreateNutritionPlanDto {
  userId: string;
  name: string;
  description?: string;
  status?: NutritionPlanStatus;
  durationDays: number;
  planData: NutritionPlanDataDto;
  macroSnapshot?: NutritionPlanMacroSnapshotDto;
}

export interface UpdateNutritionPlanDto {
  userId?: string;
  name?: string;
  description?: string;
  status?: NutritionPlanStatus;
  durationDays?: number;
  planData?: NutritionPlanDataDto;
}

export interface NutritionPlanResponseDto {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: NutritionPlanStatus;
  durationDays: number;
  planData: NutritionPlanDataDto;
  macroSnapshot: NutritionPlanMacroSnapshotDto | null;
  avgDailyCalories: number;
  avgDailyProtein: number;
  avgDailyCarbs: number;
  avgDailyFat: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateNutritionPlanResponseDto
  extends NutritionPlanResponseDto {}
