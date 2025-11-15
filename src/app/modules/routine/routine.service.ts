/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ExerciseEntity,
  RoutineEntity,
  RoutineExerciseEntity,
  RoutineRequestDto,
  RoutineSessionEntity,
  RoutineSessionRequestDto,
  SetEntity,
} from '@app/entity-data-models';
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
    @InjectRepository(RoutineSessionEntity)
    private readonly sessionRepository: Repository<RoutineSessionEntity>,
  ) {}

  async create(routineRequestDto: RoutineRequestDto, userId: string): Promise<RoutineEntity> {
    const routine = this.routineRepository.create({
      title: routineRequestDto.title,
      userId,
    });

    const savedRoutine = await this.routineRepository.save(routine);

    const routineExercises = routineRequestDto.exercises.map(
      async (exerciseDto, index) => {
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
          order: exerciseDto.order || index + 1,
          ...(exerciseDto.supersetWith && {
            supersetWith: exerciseDto.supersetWith,
          }), // 🔥 SOLUCIÓN
        });

        const savedRoutineExercise =
          await this.routineExerciseRepository.save(routineExercise);

        if (exerciseDto.sets && exerciseDto.sets.length > 0) {
          const sets = exerciseDto.sets.map(set =>
            this.setRepository.create({
              order: set.order,
              weight: set.weight,
              reps: set.reps,
              repsMin: set.repsMin,
              repsMax: set.repsMax,
              completed: set.completed ?? false,
              weightUnit: set.weightUnit || 'kg',
              repsType: set.repsType || 'reps',
              routineExercise: savedRoutineExercise,
            }),
          );

          await this.setRepository.save(sets);
        }

        return savedRoutineExercise;
      },
    );

    await Promise.all(routineExercises);

    const fullRoutine = await this.routineRepository.findOne({
      where: { id: savedRoutine.id },
      relations: [
        'routineExercises',
        'routineExercises.exercise',
        'routineExercises.sets',
      ],
      order: {
        routineExercises: {
          order: 'ASC',
        },
      },
    });

    if (!fullRoutine) {
      throw new Error(
        `Routine with id ${savedRoutine.id} not found after creation`,
      );
    }

    return fullRoutine;
  }
  async findOneWithExercises(id: string, userId: string) {
    const routine = await this.routineRepository.findOne({
      where: { id, userId },
      relations: [
        'routineExercises',
        'routineExercises.exercise',
        'routineExercises.sets',
      ],
      // 🔥 NUEVO: Ordenar por el campo order
      order: {
        routineExercises: {
          order: 'ASC',
        },
      },
    });

    if (!routine) {
      throw new NotFoundException(`Routine with id ${id} not found`);
    }

    return routine;
  }

  async update(
    id: string,
    routineRequestDto: RoutineRequestDto,
    userId: string,
  ): Promise<RoutineEntity> {
    const routine = await this.routineRepository.findOne({ where: { id, userId } });
    if (!routine) throw new NotFoundException(`Routine with id ${id} not found`);

    await this.routineRepository.update(id, {
      title: routineRequestDto.title,
    });

    await this.routineExerciseRepository.delete({ routine: { id } });

    const newRoutineExercises = routineRequestDto.exercises.map(
      async (exerciseDto, index) => {
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
          weightUnit: exerciseDto.weightUnit || 'kg',
          repsType: exerciseDto.repsType || 'reps',
          order: exerciseDto.order || index + 1,
          ...(exerciseDto.supersetWith && {
            supersetWith: exerciseDto.supersetWith,
          }), // 🔥 SOLUCIÓN
        });

        const savedRoutineExercise =
          await this.routineExerciseRepository.save(routineExercise);

        if (exerciseDto.sets && exerciseDto.sets.length > 0) {
          const sets = exerciseDto.sets.map(set =>
            this.setRepository.create({
              order: set.order,
              weight: set.weight,
              reps: set.reps,
              repsMin: set.repsMin,
              repsMax: set.repsMax,
              completed: set.completed ?? false,
              weightUnit: set.weightUnit || 'kg',
              repsType: set.repsType || 'reps',
              routineExercise: savedRoutineExercise,
            }),
          );

          await this.setRepository.save(sets);
        }

        return savedRoutineExercise;
      },
    );

    await Promise.all(newRoutineExercises);

    const updatedRoutine = await this.findOneWithExercises(id, userId);
    if (!updatedRoutine) {
      throw new NotFoundException(`Routine with id ${id} not found`);
    }
    return updatedRoutine;
  }

  async duplicate(id: string, userId: string): Promise<RoutineEntity> {
    const original = await this.findOneWithExercises(id, userId);
    if (!original) throw new NotFoundException(`Routine with id ${id} not found`);

    const baseTitle = original.title.replace(/\s\(\d+\)$/, '');
    const allCopies = await this.routineRepository.find({
      where: [
        { title: baseTitle, userId },
        { title: Like(`${baseTitle} (%)`), userId }
      ],
      select: ['title'],
    });

    let maxNumber = 1;
    allCopies.forEach(r => {
      const match = r.title.match(/\((\d+)\)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });

    const newTitle = `${baseTitle} (${maxNumber + 1})`;

    const newRoutine = this.routineRepository.create({
      title: newTitle,
      userId,
    });
    const savedRoutine = await this.routineRepository.save(newRoutine);

    // 🔥 SOLUCIÓN SIMPLIFICADA - Exactamente como en create y update
    for (const re of original.routineExercises) {
      const exercise = await this.exerciseRepository.findOne({
        where: { id: re.exercise.id },
      });

      if (!exercise) {
        throw new Error(`Exercise with id ${re.exercise.id} not found`);
      }

      // Crear routineExercise (igual que en create/update)
      const routineExercise = this.routineExerciseRepository.create({
        routine: savedRoutine,
        exercise,
        notes: re.notes,
        restSeconds: re.restSeconds,
        weightUnit: re.weightUnit || 'kg',
        repsType: re.repsType || 'reps',
        order: re.order || 0,
        ...(re.supersetWith && { supersetWith: re.supersetWith }),
      });

      const savedRoutineExercise =
        await this.routineExerciseRepository.save(routineExercise);

      // Crear sets (igual que en create/update)
      if (re.sets && re.sets.length > 0) {
        const sets = re.sets.map((set: any) => {
          // 🔥 Crear el objeto set igual que en create/update
          return this.setRepository.create({
            order: set.order,
            weight: set.weight,
            reps: set.reps,
            repsMin: set.repsMin,
            repsMax: set.repsMax,
            completed: false,
            weightUnit: set.weightUnit || 'kg',
            repsType: set.repsType || 'reps',
            routineExercise: savedRoutineExercise, // Esta es la entidad guardada
          });
        });

        await this.setRepository.save(sets);
      }
    }

    // Retornar rutina completa
    const fullRoutine = await this.routineRepository.findOne({
      where: { id: savedRoutine.id },
      relations: [
        'routineExercises',
        'routineExercises.exercise',
        'routineExercises.sets',
      ],
      order: {
        routineExercises: {
          order: 'ASC',
        },
      },
    });

    return fullRoutine || savedRoutine;
  }

  async findOne(id: string, userId: string): Promise<RoutineEntity> {
    const routine = await this.routineRepository.findOne({
      where: { id, userId },
      relations: ['exercises'],
    });
    if (!routine) {
      throw new NotFoundException(`Routine with id ${id} not found`);
    }
    return routine;
  }

  async findAll(userId: string): Promise<RoutineEntity[]> {
    return this.routineRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const routine = await this.routineRepository.findOne({ where: { id, userId } });
    if (!routine) {
      throw new NotFoundException(`Routine with id ${id} not found`);
    }
    await this.routineRepository.delete(id);
  }

  async addSession(
    dto: RoutineSessionRequestDto,
    userId: string,
  ): Promise<RoutineSessionEntity> {
    const routine = await this.routineRepository.findOne({
      where: { id: dto.routineId, userId },
      relations: ['routineExercises', 'sessions'],
    });

    if (!routine) throw new NotFoundException(`Routine with id ${dto.routineId} not found`);

    // Mapear ejercicios con información completa incluyendo imágenes
    const exercises = await Promise.all(
      (dto.exercises ?? []).map(async ex => {
        const exercise = await this.exerciseRepository.findOne({
          where: { id: ex.exerciseId },
          select: ['id', 'name', 'imageUrl', 'giftUrl'], // Incluir las URLs
        });
        if (!exercise)
          throw new Error(`Exercise with id ${ex.exerciseId} not found`);

        return {
          exerciseId: exercise.id,
          name: exercise.name,
          imageUrl: exercise.imageUrl, // ✅ Incluir imageUrl
          giftUrl: exercise.giftUrl, // ✅ Incluir giftUrl
          sets: ex.sets,
        };
      }),
    );

    const session = this.sessionRepository.create({
      routine,
      exercises,
      totalTime: dto.totalTime,
      totalWeight: dto.totalWeight,
      completedSets: dto.completedSets,
    });

    return this.sessionRepository.save(session);
  }

  async getSessions(routineId: string, userId: string) {
    // Verificar que la rutina pertenece al usuario
    const routine = await this.routineRepository.findOne({
      where: { id: routineId, userId },
    });
    if (!routine) {
      throw new NotFoundException(`Routine with id ${routineId} not found`);
    }

    return this.sessionRepository.find({
      where: { routine: { id: routineId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllSessions(userId: string) {
    return this.sessionRepository.find({
      where: { routine: { userId } },
      relations: ['routine'],
      order: { createdAt: 'DESC' },
    });
  }

  async getGlobalStats(userId: string) {
    const sessions = await this.sessionRepository.find({
      where: { routine: { userId } },
    });
    return {
      totalTime: sessions.reduce((acc, s) => acc + s.totalTime, 0),
      totalWeight: sessions.reduce((acc, s) => acc + s.totalWeight, 0),
      completedSets: sessions.reduce((acc, s) => acc + s.completedSets, 0),
    };
  }
}
