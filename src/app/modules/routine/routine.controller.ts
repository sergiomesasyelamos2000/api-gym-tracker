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
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('routines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('routines')
export class RoutineController {
  constructor(
    @InjectRepository(RoutineEntity)
    public routineRepository: Repository<RoutineEntity>,
    private readonly routineService: RoutineService,
  ) {}

  @Get('sessions')
  @ApiOperation({ summary: 'Get all sessions for current user' })
  async getAllSessions(@CurrentUser() user: CurrentUserData) {
    return this.routineService.getAllSessions(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new routine' })
  async create(
    @Body() routineRequestDto: RoutineRequestDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return await this.routineService.create(routineRequestDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all routines for current user' })
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.routineService.findAll(user.id);
  }

  @Get('stats/global')
  @ApiOperation({ summary: 'Get global stats for current user' })
  async getGlobalStats(@CurrentUser() user: CurrentUserData) {
    return await this.routineService.getGlobalStats(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get routine by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return await this.routineService.findOneWithExercises(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update routine' })
  async updateRoutine(
    @Param('id') id: string,
    @Body() routineRequestDto: RoutineRequestDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return await this.routineService.update(id, routineRequestDto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete routine' })
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData): Promise<void> {
    await this.routineService.remove(id, user.id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate routine' })
  async duplicateRoutine(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return await this.routineService.duplicate(id, user.id);
  }

  @Post(':id/sessions')
  @ApiOperation({ summary: 'Add session to routine' })
  async addSession(
    @Param('id') id: string,
    @Body() dto: RoutineSessionRequestDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return await this.routineService.addSession({ ...dto, routineId: id }, user.id);
  }

  @Get(':id/sessions')
  @ApiOperation({ summary: 'Get sessions for routine' })
  async getSessions(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return await this.routineService.getSessions(id, user.id);
  }
}
