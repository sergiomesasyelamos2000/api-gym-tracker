import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { FoodUnit, MealType, WeightUnit } from '../entities';
import {
  ActivityLevel,
  Gender,
  HeightUnit,
  WeightGoal,
} from '../entities/user-nutrition-profile.entity';

// Nested DTOs
export class UserAnthropometricsDto {
  @IsNumber()
  weight!: number;

  @IsNumber()
  height!: number;

  @IsNumber()
  age!: number;

  @IsIn(['male', 'female', 'other'])
  gender!: Gender;

  @IsString()
  activityLevel!: ActivityLevel;
}

export class UserGoalsDto {
  @IsString()
  weightGoal!: WeightGoal;

  @IsNumber()
  targetWeight!: number;

  @IsNumber()
  weeklyWeightChange!: number;
}

export class UserMacroGoalsDto {
  @IsNumber()
  dailyCalories!: number;

  @IsNumber()
  protein!: number;

  @IsNumber()
  carbs!: number;

  @IsNumber()
  fat!: number;
}

export class UserPreferencesDto {
  @IsString()
  weightUnit!: WeightUnit;

  @IsString()
  heightUnit!: HeightUnit;
}

// User Nutrition Profile DTOs
export class CreateUserNutritionProfileDto {
  @IsString()
  userId!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => UserAnthropometricsDto)
  anthropometrics!: UserAnthropometricsDto;

  @IsObject()
  @ValidateNested()
  @Type(() => UserGoalsDto)
  goals!: UserGoalsDto;

  @IsObject()
  @ValidateNested()
  @Type(() => UserMacroGoalsDto)
  macroGoals!: UserMacroGoalsDto;

  @IsObject()
  @ValidateNested()
  @Type(() => UserPreferencesDto)
  preferences!: UserPreferencesDto;
}

export class UpdateUserNutritionProfileDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserAnthropometricsDto)
  anthropometrics?: UserAnthropometricsDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserGoalsDto)
  goals?: UserGoalsDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserMacroGoalsDto)
  macroGoals?: UserMacroGoalsDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserPreferencesDto)
  preferences?: UserPreferencesDto;
}

export class UpdateMacroGoalsDto {
  @IsNumber()
  dailyCalories!: number;

  @IsNumber()
  protein!: number;

  @IsNumber()
  carbs!: number;

  @IsNumber()
  fat!: number;
}

export class UserNutritionProfileResponseDto {
  id!: string;
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
  createdAt!: Date;
  updatedAt!: Date;
}

// Food Entry DTOs
export class CreateFoodEntryDto {
  @IsString()
  userId!: string;

  @IsString()
  productCode!: string;

  @IsString()
  productName!: string;

  @IsOptional()
  @IsString()
  productImage?: string;

  @IsString()
  date!: string; // YYYY-MM-DD

  @IsString()
  mealType!: MealType;

  @IsNumber()
  quantity!: number;

  @IsString()
  unit!: FoodUnit;

  @IsOptional()
  @IsString()
  customUnitName?: string;

  @IsOptional()
  @IsNumber()
  customUnitGrams?: number;

  @IsNumber()
  calories!: number;

  @IsNumber()
  protein!: number;

  @IsNumber()
  carbs!: number;

  @IsNumber()
  fat!: number;

  @IsOptional()
  @IsNumber()
  sugar?: number;

  @IsOptional()
  @IsNumber()
  fiber?: number;

  @IsOptional()
  @IsNumber()
  sodium?: number;
}

export class UpdateFoodEntryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: FoodUnit;

  @IsOptional()
  @IsString()
  customUnitName?: string;

  @IsOptional()
  @IsNumber()
  customUnitGrams?: number;

  @IsOptional()
  @IsString()
  mealType?: MealType;

  @IsOptional()
  @IsNumber()
  calories?: number;

  @IsOptional()
  @IsNumber()
  protein?: number;

  @IsOptional()
  @IsNumber()
  carbs?: number;

  @IsOptional()
  @IsNumber()
  fat?: number;

  @IsOptional()
  @IsNumber()
  sugar?: number;

  @IsOptional()
  @IsNumber()
  fiber?: number;

  @IsOptional()
  @IsNumber()
  sodium?: number;
}

export class FoodEntryResponseDto {
  id!: string;
  userId!: string;
  productCode!: string;
  productName!: string;
  productImage?: string;
  date!: string;
  mealType!: MealType;
  quantity!: number;
  unit!: FoodUnit;
  customUnitName?: string;
  customUnitGrams?: number;
  calories!: number;
  protein!: number;
  carbs!: number;
  fat!: number;
  sugar?: number;
  fiber?: number;
  sodium?: number;
  createdAt!: Date;
}

// Daily Summary DTOs
export class DailyNutritionSummaryDto {
  date!: string;
  entries!: FoodEntryResponseDto[];
  totals!: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugar: number;
    fiber: number;
    sodium: number;
  };
  goals!: {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  hasProfile!: boolean;
}

export class BarcodeScanDto {
  @IsString()
  code!: string;
}
