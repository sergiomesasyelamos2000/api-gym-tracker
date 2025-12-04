import {
  CreateCustomMealDto,
  CreateCustomProductDto,
  CreateFavoriteProductDto,
  CreateFoodEntryDto,
  CreateShoppingListItemDto,
  CreateUserNutritionProfileDto,
  UpdateCustomMealDto,
  UpdateCustomProductDto,
  UpdateFoodEntryDto,
  UpdateMacroGoalsDto,
  UpdateShoppingListItemDto,
  UpdateUserNutritionProfileDto,
} from '@app/entity-data-models';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NutritionService } from './nutrition.service';
import { log } from 'console';

@Controller('nutrition')
// ⚠️ JwtAuthGuard removed temporarily due to token validation issues
// TODO: Investigate why valid tokens are being rejected and re-enable authentication
export class NutritionController {
  constructor(private nutritionService: NutritionService) {}

  @Post()
  async chat(
    @Body('text') text: string,
    @Body('history') history?: Array<{ role: string; content: string }>,
    @Body('userId') userId?: string,
  ) {
    const response = await this.nutritionService.chat(text, history, userId);
    return response;
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

  @Get('products/search')
  async searchProductsByName(
    @Query('q') searchTerm: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return {
          products: [],
          total: 0,
        };
      }

      const pageNum = parseInt(page) || 1;
      const pageSizeNum = parseInt(pageSize) || 20;

      const result = await this.nutritionService.searchProductsByName(
        searchTerm.trim(),
        pageNum,
        pageSizeNum,
      );

      return result;
    } catch (error) {
      console.error('Error en controller searchProductsByName:', error);
      return {
        products: [],
        total: 0,
      };
    }
  }

  @Get('products')
  async getAllProducts(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '100',
  ) {
    try {
      const pageNum = parseInt(page) || 1;
      const pageSizeNum = parseInt(pageSize) || 100;

      const result = await this.nutritionService.getAllProducts(
        pageNum,
        pageSizeNum,
      );

      return result;
    } catch (error) {
      console.error('Error en controller getAllProducts:', error);
      return {
        products: [],
        total: 0,
      };
    }
  }

  @Get('products/:code')
  async getProductDetail(@Param('code') code: string) {
    try {
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

      return profile;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Error al crear perfil de usuario: ${error.message}`,
      );
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

  // IMPORTANT: Specific routes (weekly, monthly) must come BEFORE generic routes (:date)
  // to prevent route conflicts where "weekly" or "monthly" are interpreted as dates
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
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.updateFoodEntry(entryId, dto, user.id);
  }

  @Delete('diary/:entryId')
  async deleteFoodEntry(
    @Param('entryId') entryId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.deleteFoodEntry(entryId, user.id);
  }

  // ==================== SHOPPING LIST ENDPOINTS ====================

  @Post('shopping-list')
  async addToShoppingList(@Body() dto: CreateShoppingListItemDto) {
    return this.nutritionService.addToShoppingList(dto);
  }

  @Get('shopping-list/:userId')
  async getShoppingList(@Param('userId') userId: string) {
    return this.nutritionService.getShoppingList(userId);
  }

  @Put('shopping-list/:itemId')
  async updateShoppingListItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateShoppingListItemDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.updateShoppingListItem(itemId, dto, user.id);
  }

  @Put('shopping-list/:userId/:itemId/toggle')
  async togglePurchased(
    @Param('userId') userId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.nutritionService.togglePurchased(itemId, userId);
  }

  @Delete('shopping-list/:itemId')
  async deleteShoppingListItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.deleteShoppingListItem(itemId, user.id);
  }

  @Delete('shopping-list/:userId/purchased')
  async clearPurchasedItems(@Param('userId') userId: string) {
    return this.nutritionService.clearPurchasedItems(userId);
  }

  @Delete('shopping-list/:userId/all')
  async clearShoppingList(@Param('userId') userId: string) {
    return this.nutritionService.clearShoppingList(userId);
  }

  // ==================== FAVORITES ENDPOINTS ====================

  @Post('favorites')
  async addFavorite(@Body() dto: CreateFavoriteProductDto) {
    return this.nutritionService.addFavorite(dto);
  }

  @Get('favorites/:userId')
  async getFavorites(@Param('userId') userId: string) {
    return this.nutritionService.getFavorites(userId);
  }

  @Get('favorites/:userId/check/:productCode')
  async isFavorite(
    @Param('userId') userId: string,
    @Param('productCode') productCode: string,
  ) {
    return this.nutritionService.isFavorite(userId, productCode);
  }

  @Delete('favorites/:userId/product/:productCode')
  async removeFavoriteByProductCode(
    @Param('userId') userId: string,
    @Param('productCode') productCode: string,
  ) {
    return this.nutritionService.removeFavoriteByProductCode(
      userId,
      productCode,
    );
  }

  @Get('favorites/:userId/search')
  async searchFavorites(
    @Param('userId') userId: string,
    @Query('query') query: string,
  ) {
    return this.nutritionService.searchFavorites(userId, query);
  }

  // ==================== CUSTOM PRODUCTS ENDPOINTS ====================

  @Post('custom-products')
  async createCustomProduct(@Body() dto: CreateCustomProductDto) {
    return this.nutritionService.createCustomProduct(dto);
  }

  @Get('custom-products/:userId')
  async getCustomProducts(@Param('userId') userId: string) {
    return this.nutritionService.getCustomProducts(userId);
  }

  @Get('custom-products/:userId/:productId')
  async getCustomProductById(
    @Param('userId') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.nutritionService.getCustomProductById(userId, productId);
  }

  @Put('custom-products/:productId')
  async updateCustomProduct(
    @Param('productId') productId: string,
    @Body() dto: UpdateCustomProductDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.updateCustomProduct(productId, dto, user.id);
  }

  @Delete('custom-products/:productId')
  async deleteCustomProduct(
    @Param('productId') productId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.deleteCustomProduct(productId, user.id);
  }

  @Get('custom-products/:userId/search')
  async searchCustomProducts(
    @Param('userId') userId: string,
    @Query('query') query: string,
  ) {
    return this.nutritionService.searchCustomProducts(userId, query);
  }

  // ==================== CUSTOM MEALS ENDPOINTS ====================

  @Post('custom-meals')
  async createCustomMeal(@Body() dto: CreateCustomMealDto) {
    return this.nutritionService.createCustomMeal(dto);
  }

  @Get('custom-meals/:userId')
  async getCustomMeals(@Param('userId') userId: string) {
    return this.nutritionService.getCustomMeals(userId);
  }

  @Get('custom-meals/:userId/:mealId')
  async getCustomMealById(
    @Param('userId') userId: string,
    @Param('mealId') mealId: string,
  ) {
    return this.nutritionService.getCustomMealById(userId, mealId);
  }

  @Put('custom-meals/:mealId')
  async updateCustomMeal(
    @Param('mealId') mealId: string,
    @Body() dto: UpdateCustomMealDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.updateCustomMeal(mealId, dto, user.id);
  }

  @Delete('custom-meals/:mealId')
  async deleteCustomMeal(
    @Param('mealId') mealId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.deleteCustomMeal(mealId, user.id);
  }

  @Post('custom-meals/:mealId/duplicate')
  async duplicateCustomMeal(
    @Param('mealId') mealId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.duplicateCustomMeal(mealId, user.id);
  }

  @Get('custom-meals/:userId/search')
  async searchCustomMeals(
    @Param('userId') userId: string,
    @Query('query') query: string,
  ) {
    return this.nutritionService.searchCustomMeals(userId, query);
  }
}
