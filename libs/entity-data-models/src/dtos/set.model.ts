export interface SetRequestDto {
  id: string;
  order: number;
  weight: number;
  reps: number;
  completed?: boolean;
  weightUnit?: 'kg' | 'lbs';
  repsType?: 'reps' | 'range';
}

export type WeightUnit = 'kg' | 'lbs';
export type RepsType = 'reps' | 'range';
