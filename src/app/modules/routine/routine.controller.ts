import { RoutineRequestDto } from '@app/entity-data-models';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { RoutineService } from './routine.service';

@Controller('routines')
export class RoutineController {
  constructor(private readonly routineService: RoutineService) {}

  @Post()
  async create(@Body() routineRequestDto: RoutineRequestDto) {
    return await this.routineService.create(routineRequestDto);
  }

  @Get()
  async findAll() {
    return await this.routineService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.routineService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() routineRequestDto: RoutineRequestDto,
  ) {
    return await this.routineService.update(id, routineRequestDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.routineService.remove(id);
  }
}
