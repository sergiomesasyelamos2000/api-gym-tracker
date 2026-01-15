export interface CreateCustomProductDto {
  userId: string;
  name: string;
  description?: string;
  image?: string;
  brand?: string;
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  fiberPer100?: number;
  sugarPer100?: number;
  sodiumPer100?: number;
  servingSize?: number;
  servingUnit?: string;
  barcode?: string;
}

export interface UpdateCustomProductDto {
  userId?: string;
  name?: string;
  description?: string;
  image?: string;
  brand?: string;
  caloriesPer100?: number;
  proteinPer100?: number;
  carbsPer100?: number;
  fatPer100?: number;
  fiberPer100?: number;
  sugarPer100?: number;
  sodiumPer100?: number;
  servingSize?: number;
  servingUnit?: string;
  barcode?: string;
}

export interface CustomProductResponseDto {
  id: string;
  userId: string;
  name: string;
  description?: string;
  image?: string;
  brand?: string;
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  fiberPer100?: number;
  sugarPer100?: number;
  sodiumPer100?: number;
  servingSize?: number;
  servingUnit?: string;
  barcode?: string;
  createdAt: Date;
  updatedAt: Date;
}
