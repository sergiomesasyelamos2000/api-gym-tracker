import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NutritionService } from './nutrition.service';
import {
  CreateUserNutritionProfileDto,
  UpdateUserNutritionProfileDto,
  UpdateMacroGoalsDto,
  CreateFoodEntryDto,
  UpdateFoodEntryDto,
} from '@app/entity-data-models';

@Controller('nutrition')
export class NutritionController {
  constructor(private nutritionService: NutritionService) {}

  @Post()
  async chat(@Body('text') text: string) {
    const base = await this.nutritionService.chat(text);
    return { reply: base };
  }

  @Post('photo')
  @UseInterceptors(FileInterceptor('file'))
  async analyzePhoto(@UploadedFile() file: Express.Request) {
    if (!file) {
      throw new Error('No se recibió ningún archivo');
    }

    const items = await this.nutritionService.recognizeFood(file);

    return { items };
  }

  @Post('barcode')
  async scanBarcode(@Body() body: any) {
    const product = await this.nutritionService.scanCode(body.code);
    return product;
  }

  @Get('products')
  async getAllProducts(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '100',
  ) {
    try {
      const pageNum = parseInt(page) || 1;
      const pageSizeNum = parseInt(pageSize) || 100;

      console.log('GET products - page:', pageNum, 'pageSize:', pageSizeNum);

      const result = await this.nutritionService.getAllProducts(
        pageNum,
        pageSizeNum,
      );

      return result; // Ya retorna { products: [], total: number }
    } catch (error) {
      console.error('Error en controller getAllProducts:', error);
      // Retornar estructura válida en caso de error
      return {
        products: [],
        total: 0,
      };
    }
  }

  // nutrition.controller.ts
  @Get('products/:code')
  async getProductDetail(@Param('code') code: string) {
    try {
      console.log('GET product detail - code:', code);
      const product = await this.nutritionService.getProductDetail(code);
      return product;
    } catch (error) {
      console.error('Error en controller getProductDetail:', error);
      throw error;
    }
  }

  // ==================== USER PROFILE ENDPOINTS ====================

  @Get('profile/:userId')
  async getUserProfile(@Param('userId') userId: string) {
    return this.nutritionService.getUserProfile(userId);
  }

  @Post('profile')
  async createUserProfile(@Body() dto: CreateUserNutritionProfileDto) {
    try {
      const profile = await this.nutritionService.createUserProfile(dto);
      return profile; // Ya devuelve el formato correcto gracias a mapProfileToDto
    } catch (error) {
      throw error;
    }
  }

  @Put('profile/:userId')
  async updateUserProfile(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserNutritionProfileDto,
  ) {
    return this.nutritionService.updateUserProfile(userId, dto);
  }

  @Put('profile/:userId/goals')
  async updateMacroGoals(
    @Param('userId') userId: string,
    @Body() dto: UpdateMacroGoalsDto,
  ) {
    return this.nutritionService.updateMacroGoals(userId, dto);
  }

  // ==================== FOOD DIARY ENDPOINTS ====================

  @Post('diary')
  async addFoodEntry(@Body() dto: CreateFoodEntryDto) {
    return this.nutritionService.addFoodEntry(dto);
  }

  @Get('diary/:userId/:date')
  async getDailyEntries(
    @Param('userId') userId: string,
    @Param('date') date: string,
  ) {
    return this.nutritionService.getDailyEntries(userId, date);
  }

  @Put('diary/:entryId')
  async updateFoodEntry(
    @Param('entryId') entryId: string,
    @Body() dto: UpdateFoodEntryDto,
  ) {
    return this.nutritionService.updateFoodEntry(entryId, dto);
  }

  @Delete('diary/:entryId')
  async deleteFoodEntry(@Param('entryId') entryId: string) {
    return this.nutritionService.deleteFoodEntry(entryId);
  }

  @Get('diary/:userId/weekly')
  async getWeeklySummary(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
  ) {
    return this.nutritionService.getWeeklySummary(userId, startDate);
  }

  @Get('diary/:userId/monthly')
  async getMonthlySummary(
    @Param('userId') userId: string,
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.nutritionService.getMonthlySummary(userId, year, month);
  }
}
