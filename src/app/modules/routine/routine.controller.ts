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

@Controller('routine')
export class RoutineController {
  constructor(private readonly routineService: RoutineService) {}

  @Post()
  create(@Body() routineRequestDto: RoutineRequestDto) {
    return this.routineService.create(routineRequestDto);
  }

  @Get()
  findAll() {
    return this.routineService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routineService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() routineRequestDto: RoutineRequestDto,
  ) {
    return this.routineService.update(+id, routineRequestDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.routineService.remove(+id);
  }
}
