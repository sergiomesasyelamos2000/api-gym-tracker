export interface SetRequestDto {
  id: string;
  order: number;
  weight: number;
  reps: number;
  setType?: 'warmup' | 'normal' | 'failed' | 'drop';
  repsMin?: number;
  repsMax?: number;
  completed?: boolean;
  weightUnit?: 'kg' | 'lbs';
  repsType?: 'reps' | 'range';
}
