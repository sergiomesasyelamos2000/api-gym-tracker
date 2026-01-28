import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RecognizeFoodResponseDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsNumber()
  calories?: number | null;

  @IsOptional()
  @IsNumber()
  proteins?: number | null;

  @IsOptional()
  @IsNumber()
  carbs?: number | null;

  @IsOptional()
  @IsNumber()
  fats?: number | null;

  @IsOptional()
  @IsNumber()
  servingSize?: number | null;
}

export interface LogMealSegmentation {
  imageId: number;
  recognition_results: Array<{
    id: number;
    name: string;
    prob: number;
    subclasses?: Array<{
      id: number;
      name: string;
      prob: number;
    }>;
  }>;
}

export interface LogMealNutritionalInfo {
  foodName: string;
  nutritional_info?: {
    calories: number;
    totalNutrients: {
      PROCNT?: { quantity: number }; // Proteins
      CHOCDF?: { quantity: number }; // Carbs
      FAT?: { quantity: number }; // Fats
    };
  };
  serving_size?: number;
}
