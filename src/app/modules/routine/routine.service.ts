import {
  ExerciseEntity,
  RoutineEntity,
  RoutineExerciseEntity,
  RoutineRequestDto,
  RoutineSessionEntity,
  RoutineSessionRequestDto,
  SetType,
  SetEntity,
} from '@app/entity-data-models';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';

type RoutineGlobalStats = {
  totalTime: number;
  totalWeight: number;
  completedSets: number;
};

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

  private async getNextTopSortOrder(userId: string): Promise<number> {
    const result = await this.routineRepository
      .createQueryBuilder('routine')
      .select('MIN(routine.sortOrder)', 'min')
      .where('routine.userId = :userId', { userId })
      .getRawOne<{ min: string | number | null }>();

    const min =
      result?.min === null || result?.min === undefined
        ? null
        : Number(result.min);

    if (min === null || Number.isNaN(min)) {
      return 0;
    }

    return min - 1;
  }

  async create(
    routineRequestDto: RoutineRequestDto,
    userId: string,
  ): Promise<RoutineEntity> {
    const sortOrder = await this.getNextTopSortOrder(userId);
    const routine = this.routineRepository.create({
      title: routineRequestDto.title,
      userId,
      sortOrder,
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
              assistedReps: set.assistedReps,
              repsMin: set.repsMin,
              repsMax: set.repsMax,
              setType: (set.setType as SetType | undefined) || SetType.NORMAL,
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
      relations: {
        routineExercises: {
          exercise: true,
          sets: true,
        },
      },
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
  async findOneWithExercises(
    id: string,
    userId: string,
  ): Promise<RoutineEntity | null> {
    return await this.routineRepository.findOne({
      where: { id, userId },
      relations: {
        routineExercises: {
          exercise: true,
          sets: true,
        },
      },
      // 🔥 NUEVO: Ordenar por el campo order
      order: {
        routineExercises: {
          order: 'ASC',
        },
      },
    });
  }

  async update(
    id: string,
    routineRequestDto: RoutineRequestDto,
    userId: string,
  ): Promise<RoutineEntity> {
    await this.routineRepository.update(id, {
      title: routineRequestDto.title,
    });

    const routine = await this.routineRepository.findOne({
      where: { id, userId },
    });
    if (!routine) throw new Error(`Routine with id ${id} not found`);

    // Remove previous routine_exercises and their sets explicitly by FK column.
    // Using relation criteria in delete can be unreliable depending on TypeORM translation.
    const existingRoutineExercises = await this.routineExerciseRepository.find({
      where: { routine: { id } },
      select: { id: true },
    });

    const existingRoutineExerciseIds = existingRoutineExercises
      .map(re => re.id)
      .filter((value): value is string => typeof value === 'string');

    if (existingRoutineExerciseIds.length > 0) {
      await this.setRepository
        .createQueryBuilder()
        .delete()
        .from(SetEntity)
        .where(`"routineExerciseId" IN (:...ids)`, {
          ids: existingRoutineExerciseIds,
        })
        .execute();
    }

    await this.routineExerciseRepository
      .createQueryBuilder()
      .delete()
      .from(RoutineExerciseEntity)
      .where(`"routineId" = :routineId`, { routineId: id })
      .execute();

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
              assistedReps: set.assistedReps,
              repsMin: set.repsMin,
              repsMax: set.repsMax,
              setType: (set.setType as SetType | undefined) || SetType.NORMAL,
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
      throw new Error(`Routine with id ${id} not found`);
    }
    return updatedRoutine;
  }

  async duplicate(id: string, userId: string): Promise<RoutineEntity> {
    const original = await this.findOneWithExercises(id, userId);
    if (!original) throw new Error(`Routine with id ${id} not found`);

    const baseTitle = original.title.replace(/\s\(\d+\)$/, '');
    const allCopies = await this.routineRepository.find({
      where: [{ title: baseTitle }, { title: Like(`${baseTitle} (%)`) }],
      select: { title: true },
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

    const sortOrder = await this.getNextTopSortOrder(userId);
    const newRoutine = this.routineRepository.create({
      title: newTitle,
      userId,
      sortOrder,
    });
    const savedRoutine = await this.routineRepository.save(newRoutine);

    // 🔥 SOLUCIÓN SIMPLIFICADA - Exactamente como en create y update
    for (const re of original.routineExercises ?? []) {
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
        const sets = re.sets.map((set: SetEntity) => {
          // 🔥 Crear el objeto set igual que en create/update
          return this.setRepository.create({
            order: set.order,
            weight: set.weight,
            reps: set.reps,
            assistedReps: set.assistedReps,
            repsMin: set.repsMin,
            repsMax: set.repsMax,
            setType: (set.setType as SetType | undefined) || SetType.NORMAL,
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
      relations: {
        routineExercises: {
          exercise: true,
          sets: true,
        },
      },
      order: {
        routineExercises: {
          order: 'ASC',
        },
      },
    });

    return fullRoutine || savedRoutine;
  }

  async findOne(id: string): Promise<RoutineEntity> {
    const routine = await this.routineRepository.findOne({
      where: { id },
      relations: {
        routineExercises: {
          exercise: true,
          sets: true,
        },
      },
    });
    if (!routine) {
      throw new Error(`Routine with id ${id} not found`);
    }
    return routine;
  }

  async findAll(userId: string): Promise<RoutineEntity[]> {
    return this.routineRepository.find({
      where: { userId },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async reorder(userId: string, routineIds: string[]): Promise<void> {
    if (!Array.isArray(routineIds) || routineIds.length === 0) {
      throw new BadRequestException('routineIds must be a non-empty array');
    }

    const uniqueIds = [...new Set(routineIds)];
    if (uniqueIds.length !== routineIds.length) {
      throw new BadRequestException('routineIds must not contain duplicates');
    }

    const owned = await this.routineRepository.find({
      where: { userId, id: In(uniqueIds) },
      select: { id: true },
    });

    if (owned.length !== uniqueIds.length) {
      throw new BadRequestException(
        'One or more routines do not belong to the current user',
      );
    }

    await this.routineRepository.manager.transaction(async manager => {
      await Promise.all(
        routineIds.map((id, index) =>
          manager.update(RoutineEntity, { id, userId }, { sortOrder: index }),
        ),
      );
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.routineRepository.delete({ id, userId });
  }

  async addSession(
    dto: RoutineSessionRequestDto,
    userId: string,
  ): Promise<RoutineSessionEntity> {
    const routine = await this.routineRepository.findOne({
      where: { id: dto.routineId, userId },
      relations: {
        routineExercises: true,
        sessions: true,
      },
    });

    if (!routine) throw new Error(`Routine with id ${dto.routineId} not found`);

    // Mapear ejercicios con información completa incluyendo imágenes
    const exercises = await Promise.all(
      (dto.exercises ?? []).map(async ex => {
        const exercise = await this.exerciseRepository.findOne({
          where: { id: ex.exerciseId },
          select: {
            id: true,
            name: true,
            imageUrl: true,
            giftUrl: true,
          },
        });
        if (!exercise)
          throw new Error(`Exercise with id ${ex.exerciseId} not found`);

        return {
          exerciseId: exercise.id,
          name: ex.name || ex.exerciseName || exercise.name,
          imageUrl: ex.imageUrl || exercise.imageUrl,
          giftUrl: ex.giftUrl || exercise.giftUrl,
          restSeconds: ex.restSeconds,
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
      avgHeartRate: dto.avgHeartRate ?? null,
      maxHeartRate: dto.maxHeartRate ?? null,
      caloriesBurned: dto.caloriesBurned ?? null,
      healthMetricsSource: dto.healthMetricsSource ?? null,
    });

    return this.sessionRepository.save(session);
  }

  async getSessions(
    routineId: string,
    userId: string,
  ): Promise<RoutineSessionEntity[]> {
    return this.sessionRepository.find({
      where: { routine: { id: routineId, userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllSessions(userId: string): Promise<RoutineSessionEntity[]> {
    // Optimized: Single query with JOIN instead of 2 separate queries
    return this.sessionRepository
      .createQueryBuilder('session')
      .innerJoin('session.routine', 'routine')
      .addSelect(['routine.id', 'routine.title'])
      .where('routine.userId = :userId', { userId })
      .orderBy('session.createdAt', 'DESC')
      .getMany();
  }

  /** Slim rows for macros/TDEE — avoids shipping full exercise JSON. */
  async getAllSessionBurnSummaries(
    userId: string,
  ): Promise<
    Array<{ id: string; createdAt: Date; caloriesBurned: number | null }>
  > {
    const rows = await this.sessionRepository
      .createQueryBuilder('session')
      .innerJoin('session.routine', 'routine')
      .select([
        'session.id',
        'session.createdAt',
        'session.caloriesBurned',
      ])
      .where('routine.userId = :userId', { userId })
      .orderBy('session.createdAt', 'DESC')
      .getMany();

    return rows.map(row => ({
      id: row.id,
      createdAt: row.createdAt,
      caloriesBurned: row.caloriesBurned ?? null,
    }));
  }

  async getGlobalStats(userId: string): Promise<RoutineGlobalStats> {
    // Optimized: Single query with SQL aggregation instead of 2 queries + in-memory aggregation
    const stats = await this.sessionRepository
      .createQueryBuilder('session')
      .innerJoin('session.routine', 'routine')
      .select('COALESCE(SUM(session.totalTime), 0)', 'totalTime')
      .addSelect('COALESCE(SUM(session.totalWeight), 0)', 'totalWeight')
      .addSelect('COALESCE(SUM(session.completedSets), 0)', 'completedSets')
      .where('routine.userId = :userId', { userId })
      .getRawOne();

    return {
      totalTime: parseInt(stats.totalTime) || 0,
      totalWeight: parseInt(stats.totalWeight) || 0,
      completedSets: parseInt(stats.completedSets) || 0,
    };
  }
}
