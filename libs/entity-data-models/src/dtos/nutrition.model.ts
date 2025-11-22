import { FoodUnit, MealType, WeightUnit } from '../entities';
import {
  ActivityLevel,
  Gender,
  WeightGoal,
  HeightUnit,
} from '../entities/user-nutrition-profile.entity';

// User Nutrition Profile DTOs
export class CreateUserNutritionProfileDto {
  userId!: string;
  anthropometrics!: {
    weight: number;
    height: number;
    age: number;
    gender: Gender;
    activityLevel: ActivityLevel;
  };
  goals!: {
    weightGoal: WeightGoal;
    targetWeight: number;
    weeklyWeightChange: number;
  };
  macroGoals!: {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  preferences!: {
    weightUnit: WeightUnit;
    heightUnit: HeightUnit;
  };
}

export class UpdateUserNutritionProfileDto {
  anthropometrics?: {
    weight?: number;
    height?: number;
    age?: number;
    gender?: Gender;
    activityLevel?: ActivityLevel;
  };
  goals?: {
    weightGoal?: WeightGoal;
    targetWeight?: number;
    weeklyWeightChange?: number;
  };
  macroGoals?: {
    dailyCalories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  preferences?: {
    weightUnit?: WeightUnit;
    heightUnit?: HeightUnit;
  };
}

export class UpdateMacroGoalsDto {
  dailyCalories!: number;
  protein!: number;
  carbs!: number;
  fat!: number;
}

export class UserNutritionProfileResponseDto {
  id!: string;
  userId!: string;
  anthropometrics!: {
    weight: number;
    height: number;
    age: number;
    gender: Gender; // ← Cambio de string a Gender
    activityLevel: ActivityLevel; // ← Cambio de string a ActivityLevel
  };
  goals!: {
    weightGoal: WeightGoal; // ← Cambio de string a WeightGoal
    targetWeight: number;
    weeklyWeightChange: number;
  };
  macroGoals!: {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  preferences!: {
    weightUnit: WeightUnit;
    heightUnit: HeightUnit;
  };
  createdAt!: Date;
  updatedAt!: Date;
}

// Food Entry DTOs
export interface CreateFoodEntryDto {
  userId: string;
  productCode: string;
  productName: string;
  productImage?: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  quantity: number;
  unit: FoodUnit;
  customUnitName?: string;
  customUnitGrams?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface UpdateFoodEntryDto {
  quantity?: number;
  unit?: FoodUnit;
  customUnitName?: string;
  customUnitGrams?: number;
  mealType?: MealType;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface FoodEntryResponseDto {
  id: string;
  userId: string;
  productCode: string;
  productName: string;
  productImage?: string;
  date: string;
  mealType: MealType;
  quantity: number;
  unit: FoodUnit;
  customUnitName?: string;
  customUnitGrams?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: Date;
}

// Daily Summary DTOs
// daily-nutrition-summary.dto.ts
export class DailyNutritionSummaryDto {
  date!: string;
  entries!: FoodEntryResponseDto[];
  totals!: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  goals!: {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  hasProfile!: boolean;
}
