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
    @InjectRepository(RoutineSessionEntity)
    private readonly sessionRepository: Repository<RoutineSessionEntity>,
  ) {}

  async create(routineRequestDto: RoutineRequestDto): Promise<RoutineEntity> {
    const routine = this.routineRepository.create({
      title: routineRequestDto.title,
    });

    const savedRoutine = await this.routineRepository.save(routine);

    // Crear los ejercicios asociados CON ORDER
    const routineExercises = routineRequestDto.exercises.map(
      async (exerciseDto, index) => {
        // 🔥 Agregamos el index
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
          order: exerciseDto.order || index + 1, // 🔥 NUEVO: Guardar el orden
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
      // 🔥 NUEVO: Ordenar por el campo order
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

  async findOneWithExercises(id: string) {
    return await this.routineRepository.findOne({
      where: { id },
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
  }

  async update(
    id: string,
    routineRequestDto: RoutineRequestDto,
  ): Promise<RoutineEntity> {
    await this.routineRepository.update(id, {
      title: routineRequestDto.title,
    });

    const routine = await this.routineRepository.findOne({ where: { id } });
    if (!routine) throw new Error(`Routine with id ${id} not found`);

    // Elimina los ejercicios asociados (sets se borran en cascada)
    await this.routineExerciseRepository.delete({ routine: { id } });

    // Crear los nuevos ejercicios CON ORDER
    const newRoutineExercises = routineRequestDto.exercises.map(
      async (exerciseDto, index) => {
        // 🔥 Agregamos el index
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
          order: exerciseDto.order || index + 1, // 🔥 NUEVO: Guardar el orden
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

    const updatedRoutine = await this.findOneWithExercises(id);
    if (!updatedRoutine) {
      throw new Error(`Routine with id ${id} not found`);
    }
    return updatedRoutine;
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
        exercise,
        notes: re.notes,
        restSeconds: re.restSeconds,
        weightUnit: re.weightUnit || 'kg',
        repsType: re.repsType || 'reps',
        order: re.order || 0, // 🔥 NUEVO: Copiar el orden
      });
      const savedRoutineExercise =
        await this.routineExerciseRepository.save(routineExercise);

      if (re.sets && re.sets.length > 0) {
        const sets = re.sets.map((set: any) =>
          this.setRepository.create({
            order: set.order,
            weight: set.weight,
            reps: set.reps,
            repsMin: set.repsMin,
            repsMax: set.repsMax,
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

  async findAll(): Promise<RoutineEntity[]> {
    return this.routineRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async remove(id: string): Promise<void> {
    await this.routineRepository.delete(id);
  }

  async addSession(
    dto: RoutineSessionRequestDto,
  ): Promise<RoutineSessionEntity> {
    const routine = await this.routineRepository.findOne({
      where: { id: dto.routineId },
      relations: ['routineExercises', 'sessions'],
    });

    if (!routine) throw new Error(`Routine with id ${dto.routineId} not found`);

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

  async getSessions(routineId: string) {
    return this.sessionRepository.find({
      where: { routine: { id: routineId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllSessions() {
    return this.sessionRepository.find({
      relations: ['routine'],
      order: { createdAt: 'DESC' },
    });
  }

  async getGlobalStats() {
    const sessions = await this.sessionRepository.find();
    return {
      totalTime: sessions.reduce((acc, s) => acc + s.totalTime, 0),
      totalWeight: sessions.reduce((acc, s) => acc + s.totalWeight, 0),
      completedSets: sessions.reduce((acc, s) => acc + s.completedSets, 0),
    };
  }
}
