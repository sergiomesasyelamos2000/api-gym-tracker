export interface OpenFoodFactsNutriments {
  [key: string]: number | undefined;
  'energy-kcal_100g'?: number;
  'energy-kcal'?: number;
  proteins_100g?: number;
  proteins?: number;
  carbohydrates_100g?: number;
  carbohydrates?: number;
  fat_100g?: number;
  fat?: number;
  fiber_100g?: number;
  sugars_100g?: number;
  sodium_100g?: number;
  'saturated-fat_100g'?: number;
}

export interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  product_name_es?: string;
  brands?: string;
  categories?: string;
  nutrition_grades?: string;
  nutriments?: OpenFoodFactsNutriments;
  image_url?: string;
  serving_size?: string;
}

export interface OpenFoodFactsResponse {
  product?: OpenFoodFactsProduct;
  products?: OpenFoodFactsProduct[];
  status?: number;
  count?: number;
}

export interface MappedNutrient {
  label: string;
  value: number | string | undefined | null;
}

export interface MappedProduct {
  code: string;
  name: string;
  brand: string | null;
  image: string | null;
  categories: string | null;
  nutritionGrade: string | null;
  servingSize?: string | null;
  grams: number;
  calories: number;
  carbohydrates: number;
  protein: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  saturatedFat?: number | null;
  others: MappedNutrient[];
}
