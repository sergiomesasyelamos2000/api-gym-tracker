/**
 * Frontend-compatible types without class-validator decorators
 * These are plain TypeScript interfaces for use in React Native
 */

import {
  ActivityLevel,
  Gender,
  HeightUnit,
  WeightGoal,
  WeightUnit,
  MealType,
  FoodUnit,
  SubscriptionPlan,
  SubscriptionStatus,
} from './shared-types';

// ============================================
// Auth & Google Login
// ============================================

export interface GoogleLoginDto {
  idToken: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface GoogleAuthResponseDto {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };
}

// ============================================
// Nutrition - User Profile
// ============================================

export interface UserAnthropometricsDto {
  weight: number;
  height: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
}

export interface UserGoalsDto {
  weightGoal: WeightGoal;
  targetWeight: number;
  weeklyWeightChange: number;
}

export interface UserMacroGoalsDto {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface UserPreferencesDto {
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
}

export interface CreateUserNutritionProfileDto {
  userId: string;
  anthropometrics: UserAnthropometricsDto;
  goals: UserGoalsDto;
  macroGoals: UserMacroGoalsDto;
  preferences: UserPreferencesDto;
}

export interface UpdateUserNutritionProfileDto {
  anthropometrics?: UserAnthropometricsDto;
  goals?: UserGoalsDto;
  macroGoals?: UserMacroGoalsDto;
  preferences?: UserPreferencesDto;
}

export interface UpdateMacroGoalsDto {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface UserNutritionProfileResponseDto {
  id: string;
  userId: string;
  anthropometrics: {
    weight: number;
    height: number;
    age: number;
    gender: Gender;
    activityLevel: ActivityLevel;
  };
  goals: {
    weightGoal: WeightGoal;
    targetWeight: number;
    weeklyWeightChange: number;
  };
  macroGoals: {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  preferences: {
    weightUnit: WeightUnit;
    heightUnit: HeightUnit;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Nutrition - Food Entry
// ============================================

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
  sugar?: number;
  fiber?: number;
  sodium?: number;
}

export interface UpdateFoodEntryDto {
  userId?: string;
  quantity?: number;
  unit?: FoodUnit;
  customUnitName?: string;
  customUnitGrams?: number;
  mealType?: MealType;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sugar?: number;
  fiber?: number;
  sodium?: number;
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
  sugar?: number;
  fiber?: number;
  sodium?: number;
  createdAt: Date;
}

export interface DailyNutritionSummaryDto {
  date: string;
  entries: FoodEntryResponseDto[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugar: number;
    fiber: number;
    sodium: number;
  };
  goals: {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  hasProfile: boolean;
}

export interface BarcodeScanDto {
  code: string;
}

// ============================================
// Chat
// ============================================

export interface ChatMessageDto {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequestDto {
  text: string;
  history?: ChatMessageDto[];
  userId?: string;
}

export interface ChatResponseDto {
  reply: string;
  provider: string;
  model: string;
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

// ============================================
// Recognition (Photo Analysis)
// ============================================

export interface RecognizeImageDto {
  imageBase64: string;
}

export interface RecognizedProduct {
  name: string;
  brand?: string;
  quantity?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  confidence?: number;
}

export interface RecognitionResponseDto {
  products: RecognizedProduct[];
  rawResponse?: string;
}

// ============================================
// Subscription
// ============================================

export interface CreateCheckoutSessionRequestDto {
  planId: SubscriptionPlan;
  successUrl?: string;
  cancelUrl?: string;
}

export interface VerifyPaymentRequestDto {
  sessionId: string;
}

export interface CancelSubscriptionRequestDto {
  cancelImmediately?: boolean;
  reason?: string;
}

export interface SubscriptionResponseDto {
  id: string;
  userId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialEnd?: Date;
  price: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionFeaturesDto {
  maxRoutines: number | null; // null = unlimited
  maxCustomProducts: number | null;
  maxCustomMeals: number | null;
  aiAnalysisEnabled: boolean;
  advancedStatsEnabled: boolean;
  exportDataEnabled: boolean;
  prioritySupportEnabled: boolean;
}

export interface SubscriptionStatusResponseDto {
  subscription: SubscriptionResponseDto;
  features: SubscriptionFeaturesDto;
  isPremium: boolean;
  daysRemaining?: number; // null for lifetime, undefined for free
}

export interface CheckoutSessionResponseDto {
  sessionId: string;
  checkoutUrl: string;
}

export interface CustomerPortalResponseDto {
  portalUrl: string;
}

// ============================================
// Routine Session
// ============================================

export interface RoutineSessionEntity {
  id: string;
  routineId?: string;
  exercises: {
    exerciseId: string;
    name: string;
    sets: {
      weight: number;
      reps: number;
      completed: boolean;
      isRecord?: boolean;
    }[];
  }[];
  totalTime: number;
  totalWeight: number;
  completedSets: number;
  createdAt: Date;
  _isPending?: boolean;
}
