import { ExerciseEntity, ExerciseRequestDto } from '@app/entity-data-models';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(ExerciseEntity)
    public exerciseRepository: Repository<ExerciseEntity>,
  ) {}
  create(exerciseRequestDto: ExerciseRequestDto) {
    return `This action returns all exercises`;
  }

  findAll() {
    return `This action returns all exercises`;
  }

  findOne(id: number) {
    return `This action returns a #${id} exercise`;
  }

  update(id: number, exerciseRequestDto: ExerciseRequestDto) {
    return `This action updates a #${id} exercise`;
  }

  remove(id: number) {
    return `This action removes a #${id} exercise`;
  }
}
