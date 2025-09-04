/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ExerciseEntity,
  RoutineEntity,
  RoutineExerciseEntity,
  RoutineRequestDto,
  SetEntity,
} from '@app/entity-data-models';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';

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
    const routine = this.routineRepository.create({
      title: routineRequestDto.title,
      totalTime: routineRequestDto.totalTime ?? 0,
      totalWeight: routineRequestDto.totalWeight ?? 0,
      completedSets: routineRequestDto.completedSets ?? 0,
    });

    const savedRoutine = await this.routineRepository.save(routine);

    // Crear los ejercicios asociados
    const routineExercises = routineRequestDto.exercises.map(
      async (exerciseDto) => {
        const exercise = await this.exerciseRepository.findOne({
          where: { id: exerciseDto.id },
        });
        if (!exercise) {
          throw new Error(`Exercise with id ${exerciseDto.id} not found`);
        }

        const routineExercise = this.routineExerciseRepository.create({
          routine: savedRoutine,
          exercise,
          notes: exerciseDto.notes,
          restSeconds: exerciseDto.restSeconds,
          weightUnit: exerciseDto.weightUnit || 'kg',
          repsType: exerciseDto.repsType || 'reps',
        });
        const savedRoutineExercise =
          await this.routineExerciseRepository.save(routineExercise);

        if (exerciseDto.sets && exerciseDto.sets.length > 0) {
          const sets = exerciseDto.sets.map((set) =>
            this.setRepository.create({
              order: set.order,
              weight: set.weight,
              reps: set.reps,
              completed: set.completed ?? false,
              routineExercise: savedRoutineExercise,
            }),
          );
          await this.setRepository.save(sets);
        }

        return savedRoutineExercise;
      },
    );

    await Promise.all(routineExercises);

    // 👇 Forzamos a que devuelva siempre una rutina, no null
    const fullRoutine = await this.routineRepository.findOne({
      where: { id: savedRoutine.id },
      relations: [
        'routineExercises',
        'routineExercises.exercise',
        'routineExercises.sets',
      ],
    });

    console.log('Created routine:', fullRoutine);

    if (!fullRoutine) {
      throw new Error(
        `Routine with id ${savedRoutine.id} not found after creation`,
      );
    }

    return fullRoutine;
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
    await this.routineRepository.update(id, {
      title: routineRequestDto.title,
      totalTime: routineRequestDto.totalTime ?? 0,
      totalWeight: routineRequestDto.totalWeight ?? 0,
      completedSets: routineRequestDto.completedSets ?? 0,
    });

    const routine = await this.routineRepository.findOne({ where: { id } });
    if (!routine) throw new Error(`Routine with id ${id} not found`);

    // Elimina los ejercicios asociados (sets se borran en cascada)
    await this.routineExerciseRepository.delete({ routine: { id } });

    // Crear los nuevos ejercicios
    const newRoutineExercises = routineRequestDto.exercises.map(
      async (exerciseDto) => {
        const exercise = await this.exerciseRepository.findOne({
          where: { id: exerciseDto.id },
        });
        if (!exercise) {
          throw new Error(`Exercise with id ${exerciseDto.id} not found`);
        }

        // 1. Guardar routineExercise sin sets
        const routineExercise = this.routineExerciseRepository.create({
          routine,
          exercise,
          notes: exerciseDto.notes,
          restSeconds: exerciseDto.restSeconds,
          weightUnit: exerciseDto.weightUnit || 'kg',
          repsType: exerciseDto.repsType || 'reps',
        });
        const savedRoutineExercise =
          await this.routineExerciseRepository.save(routineExercise);

        // 2. Guardar sets asociados
        if (exerciseDto.sets && exerciseDto.sets.length > 0) {
          const sets = exerciseDto.sets.map((set) =>
            this.setRepository.create({
              order: set.order,
              weight: set.weight,
              reps: set.reps,
              completed: set.completed ?? false,
              routineExercise: savedRoutineExercise,
            }),
          );
          await this.setRepository.save(sets);
        }

        return savedRoutineExercise;
      },
    );

    await Promise.all(newRoutineExercises);

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

    const baseTitle = original.title.replace(/\s\(\d+\)$/, '');
    const allCopies = await this.routineRepository.find({
      where: [{ title: baseTitle }, { title: Like(`${baseTitle} (%)`) }],
      select: ['title'],
    });

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

      // 1. Guardar routineExercise sin sets
      const routineExercise = this.routineExerciseRepository.create({
        routine: savedRoutine,
        exercise,
        notes: re.notes,
        restSeconds: re.restSeconds,
        weightUnit: re.weightUnit || 'kg',
        repsType: re.repsType || 'reps',
      });
      const savedRoutineExercise =
        await this.routineExerciseRepository.save(routineExercise);

      // 2. Guardar sets asociados
      if (re.sets && re.sets.length > 0) {
        const sets = re.sets.map((set: any) =>
          this.setRepository.create({
            order: set.order,
            weight: set.weight,
            reps: set.reps,
            completed: false,
            routineExercise: savedRoutineExercise,
          }),
        );
        await this.setRepository.save(sets);
      }

      return savedRoutineExercise;
    });

    await Promise.all(routineExercises);
    return savedRoutine;
  }
}
