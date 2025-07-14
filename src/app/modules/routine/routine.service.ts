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
import { Repository, Like } from 'typeorm';

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

  async duplicate(id: string): Promise<RoutineEntity> {
    const original = await this.findOneWithExercises(id);
    if (!original) throw new Error(`Routine with id ${id} not found`);

    // Extrae el nombre base (sin sufijo)
    const baseTitle = original.title.replace(/\s\(\d+\)$/, '');

    // Busca todas las rutinas que empiezan por el nombre base
    const allCopies = await this.routineRepository.find({
      where: [{ title: baseTitle }, { title: Like(`${baseTitle} (%)`) }],
      select: ['title'],
    });

    // Encuentra el siguiente sufijo disponible
    let maxNumber = 1;
    allCopies.forEach((r) => {
      const match = r.title.match(/\((\d+)\)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });

    const newTitle = `${baseTitle} (${maxNumber + 1})`;

    const newRoutine = this.routineRepository.create({
      title: newTitle,
      totalTime: original.totalTime,
      totalWeight: original.totalWeight,
      completedSets: original.completedSets,
    });
    const savedRoutine = await this.routineRepository.save(newRoutine);

    const routineExercises = original.routineExercises.map(async (re: any) => {
      const exercise = await this.exerciseRepository.findOne({
        where: { id: re.exercise.id },
      });

      if (!exercise) {
        throw new Error(`Exercise with id ${re.exercise.id} not found`);
      }

      const routineExercise = this.routineExerciseRepository.create({
        routine: savedRoutine,
        exercise: exercise,
        notes: re.notes,
        restSeconds: re.restSeconds,
        sets: (re.sets ?? []).map((set: any) => ({
          weight: set.weight,
          reps: set.reps,
          order: set.order,
          completed: false,
        })),
      });

      return await this.routineExerciseRepository.save(routineExercise);
    });

    await Promise.all(routineExercises);

    return savedRoutine;
  }
}
