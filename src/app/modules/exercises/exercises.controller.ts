import { CreateExerciseDto } from '@app/entity-data-models';
import { CACHE_MANAGER, CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExercisesService } from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(
    private readonly exercisesService: ExercisesService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private async invalidateExercisesCache(): Promise<void> {
    await this.cacheManager.clear();
  }

  // ==================== ENDPOINTS PÚBLICOS ====================

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600) // 10 minutes
  findAll() {
    return this.exercisesService.findAll();
  }

  @Get('search')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120) // 2 minutes
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
  @UseGuards(JwtAuthGuard)
  async createCustom(@Body() dto: CreateExerciseDto) {
    const exercise = await this.exercisesService.createCustom(dto);
    await this.invalidateExercisesCache();
    return exercise;
  }

  // ==================== ENDPOINTS DE SINCRONIZACIÓN (auth required) ====================

  @Post('sync/bodyparts')
  @UseGuards(JwtAuthGuard)
  async syncBodyParts() {
    const result = await this.exercisesService.syncBodyParts();
    await this.invalidateExercisesCache();
    return result;
  }

  @Post('sync/equipment')
  @UseGuards(JwtAuthGuard)
  async syncEquipment() {
    const result = await this.exercisesService.syncEquipment();
    await this.invalidateExercisesCache();
    return result;
  }

  @Post('sync/exercise-types')
  @UseGuards(JwtAuthGuard)
  async syncExerciseTypes() {
    const result = await this.exercisesService.syncExerciseTypes();
    await this.invalidateExercisesCache();
    return result;
  }

  @Post('sync/all')
  @UseGuards(JwtAuthGuard)
  async syncAll() {
    const result = await this.exercisesService.syncWithExerciseDB();
    await this.invalidateExercisesCache();
    return result;
  }

  @Post('sync/backfill-static-images')
  @UseGuards(JwtAuthGuard)
  async backfillStaticImages(
    @Query('batchSize') batchSize?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedBatchSize = batchSize ? Number(batchSize) : undefined;
    const parsedLimit = limit ? Number(limit) : undefined;
    const result = await this.exercisesService.backfillStaticImagesFromGifs({
      batchSize:
        Number.isFinite(parsedBatchSize) && (parsedBatchSize as number) > 0
          ? Math.min(parsedBatchSize as number, 50)
          : undefined,
      limit:
        Number.isFinite(parsedLimit) && (parsedLimit as number) > 0
          ? Math.min(parsedLimit as number, 200)
          : undefined,
    });
    await this.invalidateExercisesCache();
    return result;
  }

  @Post('sync/migrate-images-to-cloudinary')
  @UseGuards(JwtAuthGuard)
  async migrateImagesToCloudinary(
    @Query('batchSize') batchSize?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedBatchSize = batchSize ? Number(batchSize) : undefined;
    const parsedLimit = limit ? Number(limit) : undefined;
    const result = await this.exercisesService.migrateBase64ImagesToCloudinary({
      batchSize:
        Number.isFinite(parsedBatchSize) && (parsedBatchSize as number) > 0
          ? Math.min(parsedBatchSize as number, 50)
          : undefined,
      limit:
        Number.isFinite(parsedLimit) && (parsedLimit as number) > 0
          ? Math.min(parsedLimit as number, 100)
          : undefined,
    });
    await this.invalidateExercisesCache();
    return result;
  }
}
