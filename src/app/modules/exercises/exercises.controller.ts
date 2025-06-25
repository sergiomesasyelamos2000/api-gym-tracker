import { ExerciseRequestDto } from '@app/entity-data-models';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ExercisesService } from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post()
  create(@Body() exerciseRequestDto: ExerciseRequestDto) {
    return this.exercisesService.create(exerciseRequestDto);
  }

  @Get()
  findAll() {
    console.log('Fetching all exercises');

    return this.exercisesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.exercisesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() exerciseRequestDto: ExerciseRequestDto,
  ) {
    return this.exercisesService.update(id, exerciseRequestDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.exercisesService.remove(id);
  }
}
