import {
  RoutineEntity,
  RoutineRequestDto,
  RoutineSessionRequestDto,
} from '@app/entity-data-models';
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

  @Get('sessions')
  async getAllSessions() {
    return this.routineService.getAllSessions();
  }

  @Post()
  async create(@Body() routineRequestDto: RoutineRequestDto) {
    console.log('Creating routine with data:', routineRequestDto);

    return await this.routineService.create(routineRequestDto);
  }

  @Get()
  async findAll() {
    return this.routineService.findAll();
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

  @Post(':id/sessions')
  async addSession(
    @Param('id') id: string,
    @Body() dto: RoutineSessionRequestDto,
  ) {
    return await this.routineService.addSession({ ...dto, routineId: id });
  }

  @Get(':id/sessions')
  async getSessions(@Param('id') id: string) {
    return await this.routineService.getSessions(id);
  }

  @Get('stats/global')
  async getGlobalStats() {
    return await this.routineService.getGlobalStats();
  }
}
