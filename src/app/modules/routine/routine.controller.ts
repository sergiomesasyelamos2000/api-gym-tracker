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
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoutineService } from './routine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';

@Controller('routines')
@UseGuards(JwtAuthGuard)
export class RoutineController {
  constructor(
    @InjectRepository(RoutineEntity)
    public routineRepository: Repository<RoutineEntity>,
    private readonly routineService: RoutineService,
  ) {}

  // ⚠️ IMPORTANT: Specific routes MUST come BEFORE parameterized routes
  // Otherwise NestJS will match /routines/sessions as /routines/:id

  // 🧪 TEST ENDPOINT - NO AUTH - Remove after testing
  @Get('test-no-auth')
  async testNoAuth() {
    console.log('🧪 TEST: testNoAuth() called - NO AUTHENTICATION');
    return {
      message: 'Backend is reachable!',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('sessions')
  async getAllSessions(@CurrentUser() user: CurrentUserData) {
    console.log('🎯 getAllSessions() called for user:', user.id);
    const result = await this.routineService.getAllSessions(user.id);
    console.log('✅ getAllSessions() returning:', result.length, 'sessions');
    return result;
  }

  @Get('stats/global')
  async getGlobalStats(@CurrentUser() user: CurrentUserData) {
    console.log('🎯 getGlobalStats() called for user:', user.id);
    console.log('🎯 User object:', user);

    const result = await this.routineService.getGlobalStats(user.id);
    console.log('✅ getGlobalStats() returning:', result);
    return result;
  }

  @Post()
  async create(
    @Body() routineRequestDto: RoutineRequestDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return await this.routineService.create(routineRequestDto, user.id);
  }

  @Get()
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.routineService.findAll(user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return await this.routineService.findOneWithExercises(id, user.id);
  }

  @Put(':id')
  async updateRoutine(
    @Param('id') id: string,
    @Body() routineRequestDto: RoutineRequestDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return await this.routineService.update(id, routineRequestDto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<void> {
    await this.routineService.remove(id, user.id);
  }

  @Post(':id/duplicate')
  async duplicateRoutine(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return await this.routineService.duplicate(id, user.id);
  }

  @Post(':id/sessions')
  async addSession(
    @Param('id') id: string,
    @Body() dto: RoutineSessionRequestDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return await this.routineService.addSession(
      { ...dto, routineId: id },
      user.id,
    );
  }

  @Get(':id/sessions')
  async getSessions(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return await this.routineService.getSessions(id, user.id);
  }
}
