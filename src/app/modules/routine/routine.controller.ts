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
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoutineService } from './routine.service';

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
    return {
      message: 'Backend is reachable!',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('sessions')
  async getAllSessions(@CurrentUser() user: CurrentUserData) {
    const result = await this.routineService.getAllSessions(user.id);
    return result;
  }

  @Get('stats/global')
  async getGlobalStats(@CurrentUser() user: CurrentUserData) {
    const result = await this.routineService.getGlobalStats(user.id);
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
