export interface CreateShoppingListItemDto {
  userId: string;
  productCode: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unit: 'gram' | 'ml' | 'portion' | 'custom';
  customUnitName?: string;
  customUnitGrams?: number;
}

export interface UpdateShoppingListItemDto {
  quantity?: number;
  unit?: 'gram' | 'ml' | 'portion' | 'custom';
  customUnitName?: string;
  customUnitGrams?: number;
  purchased?: boolean;
}

export interface ShoppingListItemResponseDto {
  id: string;
  userId: string;
  productCode: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unit: string;
  customUnitName?: string;
  customUnitGrams?: number;
  purchased: boolean;
  createdAt: Date;
}
