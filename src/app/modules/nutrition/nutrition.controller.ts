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
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NutritionService } from './nutrition.service';
import {
  CreateUserNutritionProfileDto,
  UpdateUserNutritionProfileDto,
  UpdateMacroGoalsDto,
  CreateFoodEntryDto,
  UpdateFoodEntryDto,
  CreateShoppingListItemDto,
  UpdateShoppingListItemDto,
  CreateFavoriteProductDto,
  CreateCustomProductDto,
  UpdateCustomProductDto,
  CreateCustomMealDto,
  UpdateCustomMealDto,
} from '@app/entity-data-models';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('nutrition')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('nutrition')
export class NutritionController {
  constructor(private nutritionService: NutritionService) {}

  @Post()
  @ApiOperation({ summary: 'Chat with nutrition AI' })
  async chat(@Body('text') text: string) {
    const base = await this.nutritionService.chat(text);
    return { reply: base };
  }

  @Post('photo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Analyze food photo' })
  async analyzePhoto(@UploadedFile() file: Express.Request) {
    if (!file) {
      throw new Error('No se recibió ningún archivo');
    }

    const items = await this.nutritionService.recognizeFood(file);

    return { items };
  }

  @Post('barcode')
  @ApiOperation({ summary: 'Scan product barcode' })
  async scanBarcode(@Body() body: any) {
    const product = await this.nutritionService.scanCode(body.code);
    return product;
  }

  @Get('products')
  @ApiOperation({ summary: 'Get all products (paginated)' })
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

  @Get('products/:code')
  @ApiOperation({ summary: 'Get product detail by code' })
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

  @Get('profile')
  @ApiOperation({ summary: 'Get current user nutrition profile' })
  async getUserProfile(@CurrentUser() user: CurrentUserData) {
    return this.nutritionService.getUserProfile(user.id);
  }

  @Post('profile')
  @ApiOperation({ summary: 'Create user nutrition profile' })
  async createUserProfile(
    @Body() dto: CreateUserNutritionProfileDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    try {
      const profile = await this.nutritionService.createUserProfile({
        ...dto,
        userId: user.id,
      });
      return profile;
    } catch (error) {
      throw error;
    }
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user nutrition profile' })
  async updateUserProfile(
    @Body() dto: UpdateUserNutritionProfileDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.updateUserProfile(user.id, dto);
  }

  @Put('profile/goals')
  @ApiOperation({ summary: 'Update user macro goals' })
  async updateMacroGoals(
    @Body() dto: UpdateMacroGoalsDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.updateMacroGoals(user.id, dto);
  }

  // ==================== FOOD DIARY ENDPOINTS ====================

  @Post('diary')
  @ApiOperation({ summary: 'Add food entry to diary' })
  async addFoodEntry(
    @Body() dto: CreateFoodEntryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.addFoodEntry({ ...dto, userId: user.id });
  }

  @Get('diary/:date')
  @ApiOperation({ summary: 'Get daily food entries' })
  async getDailyEntries(
    @Param('date') date: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.getDailyEntries(user.id, date);
  }

  @Put('diary/:entryId')
  @ApiOperation({ summary: 'Update food entry' })
  async updateFoodEntry(
    @Param('entryId') entryId: string,
    @Body() dto: UpdateFoodEntryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.updateFoodEntry(entryId, dto, user.id);
  }

  @Delete('diary/:entryId')
  @ApiOperation({ summary: 'Delete food entry' })
  async deleteFoodEntry(
    @Param('entryId') entryId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.deleteFoodEntry(entryId, user.id);
  }

  @Get('diary/weekly')
  @ApiOperation({ summary: 'Get weekly food diary summary' })
  async getWeeklySummary(
    @Query('startDate') startDate: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.getWeeklySummary(user.id, startDate);
  }

  @Get('diary/monthly')
  @ApiOperation({ summary: 'Get monthly food diary summary' })
  async getMonthlySummary(
    @Query('year') year: number,
    @Query('month') month: number,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.getMonthlySummary(user.id, year, month);
  }

  // ==================== SHOPPING LIST ENDPOINTS ====================

  @Post('shopping-list')
  @ApiOperation({ summary: 'Add item to shopping list' })
  async addToShoppingList(
    @Body() dto: CreateShoppingListItemDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.addToShoppingList({ ...dto, userId: user.id });
  }

  @Get('shopping-list')
  @ApiOperation({ summary: 'Get user shopping list' })
  async getShoppingList(@CurrentUser() user: CurrentUserData) {
    return this.nutritionService.getShoppingList(user.id);
  }

  @Put('shopping-list/:itemId')
  @ApiOperation({ summary: 'Update shopping list item' })
  async updateShoppingListItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateShoppingListItemDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.updateShoppingListItem(itemId, dto, user.id);
  }

  @Put('shopping-list/:itemId/toggle')
  @ApiOperation({ summary: 'Toggle purchased status' })
  async togglePurchased(
    @Param('itemId') itemId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.togglePurchased(itemId, user.id);
  }

  @Delete('shopping-list/:itemId')
  @ApiOperation({ summary: 'Delete shopping list item' })
  async deleteShoppingListItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.deleteShoppingListItem(itemId, user.id);
  }

  @Delete('shopping-list/purchased')
  @ApiOperation({ summary: 'Clear purchased items from shopping list' })
  async clearPurchasedItems(@CurrentUser() user: CurrentUserData) {
    return this.nutritionService.clearPurchasedItems(user.id);
  }

  @Delete('shopping-list/all')
  @ApiOperation({ summary: 'Clear entire shopping list' })
  async clearShoppingList(@CurrentUser() user: CurrentUserData) {
    return this.nutritionService.clearShoppingList(user.id);
  }

  // ==================== FAVORITES ENDPOINTS ====================

  @Post('favorites')
  @ApiOperation({ summary: 'Add product to favorites' })
  async addFavorite(
    @Body() dto: CreateFavoriteProductDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.addFavorite({ ...dto, userId: user.id });
  }

  @Get('favorites')
  @ApiOperation({ summary: 'Get user favorite products' })
  async getFavorites(@CurrentUser() user: CurrentUserData) {
    return this.nutritionService.getFavorites(user.id);
  }

  @Get('favorites/check/:productCode')
  @ApiOperation({ summary: 'Check if product is favorite' })
  async isFavorite(
    @Param('productCode') productCode: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.isFavorite(user.id, productCode);
  }

  @Delete('favorites/product/:productCode')
  @ApiOperation({ summary: 'Remove favorite product' })
  async removeFavoriteByProductCode(
    @Param('productCode') productCode: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.removeFavoriteByProductCode(
      user.id,
      productCode,
    );
  }

  @Get('favorites/search')
  @ApiOperation({ summary: 'Search favorite products' })
  async searchFavorites(
    @Query('query') query: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.searchFavorites(user.id, query);
  }

  // ==================== CUSTOM PRODUCTS ENDPOINTS ====================

  @Post('custom-products')
  @ApiOperation({ summary: 'Create custom product' })
  async createCustomProduct(
    @Body() dto: CreateCustomProductDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.createCustomProduct({ ...dto, userId: user.id });
  }

  @Get('custom-products')
  @ApiOperation({ summary: 'Get user custom products' })
  async getCustomProducts(@CurrentUser() user: CurrentUserData) {
    return this.nutritionService.getCustomProducts(user.id);
  }

  @Get('custom-products/:productId')
  @ApiOperation({ summary: 'Get custom product by ID' })
  async getCustomProductById(
    @Param('productId') productId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.getCustomProductById(user.id, productId);
  }

  @Put('custom-products/:productId')
  @ApiOperation({ summary: 'Update custom product' })
  async updateCustomProduct(
    @Param('productId') productId: string,
    @Body() dto: UpdateCustomProductDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.updateCustomProduct(productId, dto, user.id);
  }

  @Delete('custom-products/:productId')
  @ApiOperation({ summary: 'Delete custom product' })
  async deleteCustomProduct(
    @Param('productId') productId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.deleteCustomProduct(productId, user.id);
  }

  @Get('custom-products/search')
  @ApiOperation({ summary: 'Search custom products' })
  async searchCustomProducts(
    @Query('query') query: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.searchCustomProducts(user.id, query);
  }

  // ==================== CUSTOM MEALS ENDPOINTS ====================

  @Post('custom-meals')
  @ApiOperation({ summary: 'Create custom meal' })
  async createCustomMeal(
    @Body() dto: CreateCustomMealDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.createCustomMeal({ ...dto, userId: user.id });
  }

  @Get('custom-meals')
  @ApiOperation({ summary: 'Get user custom meals' })
  async getCustomMeals(@CurrentUser() user: CurrentUserData) {
    return this.nutritionService.getCustomMeals(user.id);
  }

  @Get('custom-meals/:mealId')
  @ApiOperation({ summary: 'Get custom meal by ID' })
  async getCustomMealById(
    @Param('mealId') mealId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.getCustomMealById(user.id, mealId);
  }

  @Put('custom-meals/:mealId')
  @ApiOperation({ summary: 'Update custom meal' })
  async updateCustomMeal(
    @Param('mealId') mealId: string,
    @Body() dto: UpdateCustomMealDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.updateCustomMeal(mealId, dto, user.id);
  }

  @Delete('custom-meals/:mealId')
  @ApiOperation({ summary: 'Delete custom meal' })
  async deleteCustomMeal(
    @Param('mealId') mealId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.deleteCustomMeal(mealId, user.id);
  }

  @Post('custom-meals/:mealId/duplicate')
  @ApiOperation({ summary: 'Duplicate custom meal' })
  async duplicateCustomMeal(
    @Param('mealId') mealId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.duplicateCustomMeal(mealId, user.id);
  }

  @Get('custom-meals/search')
  @ApiOperation({ summary: 'Search custom meals' })
  async searchCustomMeals(
    @Query('query') query: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.nutritionService.searchCustomMeals(user.id, query);
  }
}
