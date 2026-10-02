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
  /** Snapshot of product thumbnail for meal editing / display */
  productImage?: string | null;
}

export type MealImageSource = 'user' | 'collage';
export type MealImageKind = 'user' | 'auto';

export interface CreateCustomMealDto {
  userId: string;
  name: string;
  description?: string;
  /** User photo (data URL / remote). Omit for auto collage. Null clears on update. */
  image?: string | null;
  /** user = keep/upload photo; auto = server builds product collage */
  imageKind?: MealImageKind;
  products: MealProductDto[];
}

export interface UpdateCustomMealDto {
  userId?: string;
  name?: string;
  description?: string;
  /** User photo (data URL / remote). Null clears and triggers collage when imageKind=auto. */
  image?: string | null;
  /** user = keep/upload photo; auto = server builds product collage */
  imageKind?: MealImageKind;
  products?: MealProductDto[];
}

export interface CustomMealResponseDto {
  id: string;
  userId: string;
  name: string;
  description?: string;
  image?: string;
  /** How meal.image was produced. Null = legacy row. */
  imageSource?: MealImageSource | null;
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

/** List payload without nested products JSON. */
export interface CustomMealListItemDto {
  id: string;
  userId: string;
  name: string;
  description?: string;
  image?: string;
  imageSource?: MealImageSource | null;
  productCount: number;
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
