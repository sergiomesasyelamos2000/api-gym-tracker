export interface CreateFavoriteProductDto {
  userId: string;
  productCode: string;
  productName: string;
  productImage?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FavoriteProductResponseDto {
  id: string;
  userId: string;
  productCode: string;
  productName: string;
  productImage?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: Date;
}
