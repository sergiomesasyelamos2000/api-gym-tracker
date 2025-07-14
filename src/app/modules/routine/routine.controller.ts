import { RoutineEntity, RoutineRequestDto } from '@app/entity-data-models';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { RoutineService } from './routine.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('routines')
export class RoutineController {
  constructor(
    @InjectRepository(RoutineEntity)
    public routineRepository: Repository<RoutineEntity>,
    private readonly routineService: RoutineService,
  ) {}

  @Post()
  async create(@Body() routineRequestDto: RoutineRequestDto) {
    return await this.routineService.create(routineRequestDto);
  }

  @Get()
  async findAll() {
    return await this.routineRepository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.routineService.findOneWithExercises(id);
  }

  @Put(':id')
  async updateRoutine(
    @Param('id') id: string,
    @Body() routineRequestDto: RoutineRequestDto,
  ) {
    return await this.routineService.update(id, routineRequestDto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.routineService.remove(id);
  }

  @Post(':id/duplicate')
  async duplicateRoutine(@Param('id') id: string) {
    return await this.routineService.duplicate(id);
  }
}
