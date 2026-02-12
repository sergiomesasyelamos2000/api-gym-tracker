// Shared types for cross-platform use (mobile + backend)
// These are plain TypeScript types without decorators

// Nutrition Profile Types
export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active';

export type Gender = 'male' | 'female' | 'other';
export type WeightGoal = 'lose' | 'maintain' | 'gain';
export type HeightUnit = 'cm' | 'ft';

// Food Entry Types
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodUnit = 'gram' | 'ml' | 'portion' | 'custom';

// Exercise Types
export enum WeightUnit {
  KG = 'kg',
  LBS = 'lbs',
}

export enum RepsType {
  REPS = 'reps',
  RANGE = 'range',
}

export interface ExerciseNote {
  id: string;
  text: string;
  createdAt: string;
}

// Shopping List Item (plain interface without TypeORM decorators)
export interface ShoppingListItem {
  id: string;
  userId: string;
  productCode: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unit: FoodUnit;
  customUnitName?: string;
  customUnitGrams?: number;
  purchased: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription Types
export enum SubscriptionPlan {
  FREE = 'free',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  LIFETIME = 'lifetime',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
  PAST_DUE = 'past_due',
  INCOMPLETE = 'incomplete',
  TRIAL = 'trial',
}
