import { CreateExerciseDto } from '@app/entity-data-models';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ExercisesService } from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  // ==================== ENDPOINTS PÚBLICOS ====================

  @Get()
  findAll() {
    return this.exercisesService.findAll();
  }

  @Get('search')
  searchByName(@Query('name') name: string) {
    return this.exercisesService.searchByName(name);
  }

  @Get('equipment/all')
  getEquipment() {
    return this.exercisesService.findAllEquipment();
  }

  @Get('muscles/all')
  getMuscles() {
    return this.exercisesService.findAllMuscles();
  }

  @Get('exercise-types/all')
  getExerciseTypes() {
    return this.exercisesService.findAllExerciseTypes();
  }

  @Post()
  createCustom(@Body() dto: CreateExerciseDto) {
    return this.exercisesService.createCustom(dto);
  }

  // ==================== ENDPOINTS DE SINCRONIZACIÓN ====================

  @Post('sync/bodyparts')
  syncBodyParts() {
    return this.exercisesService.syncBodyParts();
  }

  @Post('sync/equipment')
  syncEquipment() {
    return this.exercisesService.syncEquipment();
  }

  @Post('sync/exercise-types')
  syncExerciseTypes() {
    return this.exercisesService.syncExerciseTypes();
  }
}
