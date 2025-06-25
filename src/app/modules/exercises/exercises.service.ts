import { ExerciseEntity, ExerciseRequestDto } from '@app/entity-data-models';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(ExerciseEntity)
    public exerciseRepository: Repository<ExerciseEntity>,
  ) {}

  async create(
    exerciseRequestDto: ExerciseRequestDto,
  ): Promise<ExerciseEntity> {
    const newExercise = this.exerciseRepository.create(
      exerciseRequestDto as Partial<ExerciseEntity>,
    );
    return await this.exerciseRepository.save(newExercise);
  }

  async findAll(): Promise<ExerciseEntity[]> {
    return await this.exerciseRepository.find();
  }

  async findOne(id: string): Promise<ExerciseEntity> {
    const exercise = await this.exerciseRepository.findOne({ where: { id } });
    if (!exercise) {
      throw new NotFoundException(`Exercise with ID ${id} not found`);
    }
    return exercise;
  }

  async update(
    id: string,
    exerciseRequestDto: ExerciseRequestDto,
  ): Promise<ExerciseEntity> {
    const exercise = await this.findOne(id);
    const updatedExercise = this.exerciseRepository.merge(
      exercise,
      exerciseRequestDto,
    );

    const savedExercise = await this.exerciseRepository.save(updatedExercise);
    return savedExercise;
  }

  async remove(id: string): Promise<void> {
    const exercise = await this.findOne(id);
    await this.exerciseRepository.remove(exercise);
  }
}
