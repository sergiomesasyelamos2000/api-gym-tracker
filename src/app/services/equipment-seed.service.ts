import {
  EquipmentEntity,
  ExerciseTypeEntity,
  MuscleEntity,
} from '@app/entity-data-models';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class DataSeedService {
  constructor(
    @InjectRepository(EquipmentEntity)
    private readonly equipmentRepository: Repository<EquipmentEntity>,

    @InjectRepository(MuscleEntity)
    private readonly muscleRepository: Repository<MuscleEntity>,

    @InjectRepository(ExerciseTypeEntity)
    private readonly exerciseTypeRepository: Repository<ExerciseTypeEntity>,
  ) {}

  async run() {
    await this.seedEquipment();
    await this.seedMuscles();
    await this.seedExerciseTypes();
  }

  private async seedEquipment() {
    const equipmentData = [
      { name: 'Ninguno', imagePath: undefined },
      {
        name: 'Banda de resistencia',
        imagePath: '/public/images/equipment/resistance_band.png',
      },
      {
        name: 'Banda de Suspensión',
        imagePath: '/public/images/equipment/suspension_band.png',
      },
      { name: 'Barra', imagePath: '/public/images/equipment/barbell.png' },
      { name: 'Mancuerna', imagePath: '/public/images/equipment/dumbbell.png' },
      { name: 'Máquina', imagePath: '/public/images/equipment/machine.png' },
      {
        name: 'Pesa Rusa',
        imagePath: '/public/images/equipment/kettlebell.png',
      },
      {
        name: 'Placa de Peso',
        imagePath: '/public/images/equipment/weight_plate.png',
      },
      { name: 'Otro', imagePath: undefined },
    ];

    for (const eq of equipmentData) {
      const exists = await this.equipmentRepository.findOne({
        where: { name: eq.name },
      });
      if (!exists) await this.equipmentRepository.save(eq);
    }
  }

  private async seedMuscles() {
    const muscleData = [
      { name: 'Abdominales', image: '💪' },
      { name: 'Abdomen', image: '💪' },
      { name: 'Abductores', image: '🦵' },
      { name: 'Aductores', image: '🦵' },
      { name: 'Antebrazos', image: '💪' },
      { name: 'Bíceps', image: '💪' },
      { name: 'Sistema cardiovascular', image: '❤️' },
      { name: 'Cuádriceps', image: '🦵' },
      { name: 'Cuello', image: '👔' },
      { name: 'Cuerpo entero', image: '🎯' },
      { name: 'Dorsales', image: '🔙' },
      { name: 'Espalda baja', image: '🔙' },
      { name: 'Espalda superior', image: '🔙' },
      { name: 'Gemelos', image: '🦵' },
      { name: 'Glúteos', image: '🍑' },
      { name: 'Hombros', image: '💪' },
      { name: 'Isquiotibiales', image: '🦵' },
      { name: 'Pecho', image: '👕' },
      { name: 'Trapecio', image: '🔙' },
      { name: 'Tríceps', image: '💪' },
    ];

    for (const m of muscleData) {
      const exists = await this.muscleRepository.findOne({
        where: { name: m.name },
      });
      if (!exists) await this.muscleRepository.save(m);
    }
  }

  private async seedExerciseTypes() {
    const exerciseTypeData = [
      { name: 'Duración y peso', image: '⏱️🏋️' },
      { name: 'Repeticiones', image: '🔁' },
      { name: 'Series y repeticiones', image: '📊' },
      { name: 'Distancia y tiempo', image: '📏⏱️' },
      { name: 'Peso corporal', image: '👤' },
      { name: 'Tiempo', image: '⏱️' },
      { name: 'Otro', image: '❓' },
    ];

    for (const et of exerciseTypeData) {
      const exists = await this.exerciseTypeRepository.findOne({
        where: { name: et.name },
      });
      if (!exists) await this.exerciseTypeRepository.save(et);
    }
  }
}
