import {
  RoutineEntity,
  RoutineRequestDto,
  RoutineSessionRequestDto,
} from '@app/entity-data-models';
import type {
  GlobalRoutineStats,
  RoutineResponse,
  RoutineSession,
} from '@sergiomesasyelamos2000/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireSubscription } from '../subscription/decorators/require-subscription.decorator';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';
import { RoutineService } from './routine.service';
import {
  mapGlobalStatsToContract,
  mapRoutineListToContract,
  mapRoutineToContract,
  mapSessionListToContract,
  mapSessionToContract,
} from './mappers/routine-contract.mapper';

@Controller('routines')
@UseGuards(JwtAuthGuard)
export class RoutineController {
  constructor(
    @InjectRepository(RoutineEntity)
    public routineRepository: Repository<RoutineEntity>,
    private readonly routineService: RoutineService,
  ) {}

  @Get('test-no-auth')
  async testNoAuth() {
    return {
      message: 'Backend is reachable!',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('sessions')
  async getAllSessions(@CurrentUser() user: CurrentUserData): Promise<RoutineSession[]> {
    const result = await this.routineService.getAllSessions(user.id);
    return mapSessionListToContract(result);
  }

  @Get('stats/global')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60)
  async getGlobalStats(@CurrentUser() user: CurrentUserData): Promise<GlobalRoutineStats> {
    const result = await this.routineService.getGlobalStats(user.id);
    return mapGlobalStatsToContract(result);
  }

  @Post()
  @UseGuards(SubscriptionGuard)
  @RequireSubscription('create_routine')
  async create(
    @Body() routineRequestDto: RoutineRequestDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<RoutineResponse> {
    const created = await this.routineService.create(routineRequestDto, user.id);
    return mapRoutineToContract(created);
  }

  @Get()
  async findAll(@CurrentUser() user: CurrentUserData): Promise<RoutineResponse[]> {
    const routines = await this.routineService.findAll(user.id);
    return mapRoutineListToContract(routines);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<RoutineResponse> {
    const routine = await this.routineService.findOneWithExercises(id, user.id);
    if (!routine) {
      throw new NotFoundException(`Routine with id ${id} not found`);
    }
    return mapRoutineToContract(routine);
  }

  @Put(':id')
  async updateRoutine(
    @Param('id') id: string,
    @Body() routineRequestDto: RoutineRequestDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<RoutineResponse> {
    const updated = await this.routineService.update(id, routineRequestDto, user.id);
    return mapRoutineToContract(updated);
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
  ): Promise<RoutineResponse> {
    const duplicated = await this.routineService.duplicate(id, user.id);
    return mapRoutineToContract(duplicated);
  }

  @Post(':id/sessions')
  async addSession(
    @Param('id') id: string,
    @Body() dto: RoutineSessionRequestDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<RoutineSession> {
    const session = await this.routineService.addSession({ ...dto, routineId: id }, user.id);
    return mapSessionToContract(session);
  }

  @Get(':id/sessions')
  async getSessions(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<RoutineSession[]> {
    const sessions = await this.routineService.getSessions(id, user.id);
    return mapSessionListToContract(sessions);
  }
}
