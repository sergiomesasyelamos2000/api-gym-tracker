export interface MealProductDto {
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar?: number | null;
  fiber?: number | null;
  sodium?: number | null;
  isCustom?: boolean;
}

export interface CreateCustomMealDto {
  userId: string;
  name: string;
  description?: string;
  image?: string;
  products: MealProductDto[];
}

export interface UpdateCustomMealDto {
  userId?: string;
  name?: string;
  description?: string;
  image?: string;
  products?: MealProductDto[];
}

export interface CustomMealResponseDto {
  id: string;
  userId: string;
  name: string;
  description?: string;
  image?: string;
  products: MealProductDto[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalSugar?: number | null;
  totalFiber?: number | null;
  totalSodium?: number | null;
  createdAt: Date;
  updatedAt: Date;
}
