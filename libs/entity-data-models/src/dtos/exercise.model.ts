import { SetRequestDto } from './set.model';

export interface ExerciseRequestDto {
  id: string;
  name: string; // 🔥 Cambiado de 'title' a 'name'
  muscularGroup?: string;
  imageUrl?: string; // 🔥 Cambiado de 'photoUrl' a 'imageUrl'
  giftUrl?: string; // 🔥 NUEVO para GIFs
  notes?: string;
  restSeconds?: string;
  sets?: SetRequestDto[];
  weightUnit: 'kg' | 'lbs';
  repsType: 'reps' | 'range';
  order?: number;
  supersetWith?: string; // 🔥 NUEVO para superseries
}

export class ExerciseResponseDto {
  id: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
  imageUrl?: string;
  exerciseType?: string;
  videoUrl?: string;
  order?: number;
  supersetWith?: string; // 🔥 NUEVO
}

export class EquipmentDto {
  name: string;
  image?: string;
}

export class CreateExerciseDto {
  name: string;
  equipment: string;
  primaryMuscle: string;
  otherMuscles?: string[];
  type?: string;
  imageBase64?: string;
}
