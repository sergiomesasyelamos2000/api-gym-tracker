export interface MealProductDto {
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
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
  createdAt: Date;
  updatedAt: Date;
}
