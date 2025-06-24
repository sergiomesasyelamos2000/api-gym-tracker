import { RoutineRequestDto } from '@app/entity-data-models';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoutineService {
  create(routineRequestDto: RoutineRequestDto) {
    return 'This action adds a new routine';
  }

  findAll() {
    return `This action returns all routine`;
  }

  findOne(id: number) {
    return `This action returns a #${id} routine`;
  }

  update(id: number, routineRequestDto: RoutineRequestDto) {
    return `This action updates a #${id} routine`;
  }

  remove(id: number) {
    return `This action removes a #${id} routine`;
  }
}
