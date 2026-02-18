import { CreateExerciseDto } from '@app/entity-data-models';
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ExercisesService } from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  // ==================== ENDPOINTS PÚBLICOS ====================

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600) // 10 minutes
  findAll() {
    return this.exercisesService.findAll();
  }

  @Get('search')
  search(
    @Query('name') name?: string,
    @Query('equipment') equipment?: string,
    @Query('muscle') muscle?: string,
  ) {
    return this.exercisesService.search({
      name,
      equipment,
      muscle,
    });
  }

  @Get('equipment/all')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600) // 10 minutes
  getEquipment() {
    return this.exercisesService.findAllEquipment();
  }

  @Get('muscles/all')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600) // 10 minutes
  getMuscles() {
    return this.exercisesService.findAllMuscles();
  }

  @Get('exercise-types/all')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600) // 10 minutes
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
