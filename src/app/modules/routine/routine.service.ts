import {
  ExerciseEntity,
  RoutineEntity,
  RoutineExerciseEntity,
  RoutineRequestDto,
  SetEntity,
} from '@app/entity-data-models';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { log } from 'console';
import { Repository } from 'typeorm';

@Injectable()
export class RoutineService {
  constructor(
    @InjectRepository(RoutineEntity)
    private readonly routineRepository: Repository<RoutineEntity>,
    @InjectRepository(RoutineExerciseEntity)
    private readonly routineExerciseRepository: Repository<RoutineExerciseEntity>,
    @InjectRepository(ExerciseEntity)
    private readonly exerciseRepository: Repository<ExerciseEntity>,
    @InjectRepository(SetEntity)
    private readonly setRepository: Repository<SetEntity>,
  ) {}

  async create(routineRequestDto: RoutineRequestDto): Promise<RoutineEntity> {
    // Crear la rutina
    const routine = this.routineRepository.create({
      title: routineRequestDto.title,
      totalTime: routineRequestDto.totalTime ?? 0,
      totalWeight: routineRequestDto.totalWeight ?? 0,
      completedSets: routineRequestDto.completedSets ?? 0,
    });

    const savedRoutine = await this.routineRepository.save(routine);

    // Crear los ejercicios asociados a la rutina
    const routineExercises = routineRequestDto.exercises.map(
      async (exerciseDto) => {
        const exercise = await this.exerciseRepository.findOne({
          where: { id: exerciseDto.id },
        });

        if (!exercise) {
          throw new Error(`Exercise with id ${exerciseDto.id} not found`);
        }
        console.log('Creating routine exercise for:', routineRequestDto);

        const routineExercise = this.routineExerciseRepository.create({
          routine: savedRoutine,
          exercise,
          notes: exerciseDto.notes,
          restSeconds: exerciseDto.restSeconds,
          sets: (exerciseDto.sets ?? []).map((set) => ({
            ...set,
          })),
        });

        return await this.routineExerciseRepository.save(routineExercise);
      },
    );

    await Promise.all(routineExercises);

    return savedRoutine;
  }

  async findOne(id: string): Promise<RoutineEntity> {
    const routine = await this.routineRepository.findOne({
      where: { id },
      relations: ['exercises'],
    });
    if (!routine) {
      throw new Error(`Routine with id ${id} not found`);
    }
    return routine;
  }

  async findOneWithExercises(id: string) {
    return await this.routineRepository.findOne({
      where: { id },
      relations: [
        'routineExercises',
        'routineExercises.exercise',
        'routineExercises.sets',
      ],
    });
  }

  async update(
    id: string,
    routineRequestDto: RoutineRequestDto,
  ): Promise<RoutineEntity> {
    // Actualiza los campos principales de la rutina
    await this.routineRepository.update(id, {
      title: routineRequestDto.title,
      totalTime: routineRequestDto.totalTime ?? 0,
      totalWeight: routineRequestDto.totalWeight ?? 0,
      completedSets: routineRequestDto.completedSets ?? 0,
    });

    const routine = await this.routineRepository.findOne({ where: { id } });
    if (!routine) throw new Error(`Routine with id ${id} not found`);

    // Elimina los routineExercises asociados (los sets se eliminan automáticamente por CASCADE)
    await this.routineExerciseRepository.delete({ routine: { id } });

    // Crea los ejercicios asociados nuevos
    const newRoutineExercises = routineRequestDto.exercises.map(
      async (exerciseDto) => {
        const exercise = await this.exerciseRepository.findOne({
          where: { id: exerciseDto.id },
        });

        if (!exercise) {
          throw new Error(`Exercise with id ${exerciseDto.id} not found`);
        }

        const routineExercise = this.routineExerciseRepository.create({
          routine,
          exercise,
          notes: exerciseDto.notes,
          restSeconds: exerciseDto.restSeconds,
          sets: (exerciseDto.sets ?? []).map((set) => ({
            ...set,
          })),
        });

        return await this.routineExerciseRepository.save(routineExercise);
      },
    );

    await Promise.all(newRoutineExercises);

    // Devuelve la rutina actualizada con ejercicios y sets
    const updatedRoutine = await this.findOneWithExercises(id);
    if (!updatedRoutine) {
      throw new Error(`Routine with id ${id} not found`);
    }
    return updatedRoutine;
  }

  async remove(id: string): Promise<void> {
    await this.routineRepository.delete(id);
  }
}
