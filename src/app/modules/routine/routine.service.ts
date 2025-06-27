import {
  ExerciseEntity,
  RoutineEntity,
  RoutineExerciseEntity,
  RoutineRequestDto,
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

  async findAll(): Promise<RoutineEntity[]> {
    return await this.routineRepository.find({ relations: ['exercises'] });
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

  async update(
    id: string,
    routineRequestDto: RoutineRequestDto,
  ): Promise<RoutineEntity> {
    await this.routineRepository.update(id, routineRequestDto);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.routineRepository.delete(id);
  }
}
