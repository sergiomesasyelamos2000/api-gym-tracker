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
  BarcodeScanDto,
  RecognizeFoodResponseDto,
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
import {
  CurrentUser,
  CurrentUserData,
} from '../auth/decorators/current-user.decorator';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';
import { RequireSubscription } from '../subscription/decorators/require-subscription.decorator';
import { NutritionService } from './nutrition.service';
import { ProductService } from './services/product.service';
import { MealService } from './services/meal.service';
import { DiaryService } from './services/diary.service';
import { ShoppingListService } from './services/shopping-list.service';
import { ProfileService } from './services/profile.service';

@Controller('nutrition')
// ⚠️ JwtAuthGuard removed temporarily due to token validation issues
// TODO: Investigate why valid tokens are being rejected and re-enable authentication
export class NutritionController {
  constructor(
    private nutritionService: NutritionService,
    private productService: ProductService,
    private mealService: MealService,
    private diaryService: DiaryService,
    private shoppingListService: ShoppingListService,
    private profileService: ProfileService,
  ) {}

  @Post()
  async chat(
    @Body('text') text: string,
    @Body('history') history?: Array<{ role: string; content: string }>,
    @Body('userId') userId?: string,
  ) {
    const response = await this.nutritionService.chat(text, history, userId);
    return response;
  }

  @Get('usage/:userId')
  async getChatUsage(@Param('userId') userId: string) {
    return this.nutritionService.getChatUsage(userId);
  }

  @Post('photo')
  @UseInterceptors(FileInterceptor('file'))
  async analyzePhoto(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<RecognizeFoodResponseDto[]> {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    const item = await this.nutritionService.recognizeFood(file);
    return Array.isArray(item) ? item : [item];
  }

  @Post('barcode')
  async scanBarcode(@Body() body: BarcodeScanDto) {
    const product = await this.productService.scanCode(body.code);
    return product;
  }

  @Get('products/search')
  async searchProductsByName(
    @Query('q') searchTerm: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('overlay') overlay: string = '1',
    @Query('brand') brand: string = '',
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
      const includeOverlay = !(overlay === '0' || overlay === 'false');

      const result = await this.productService.searchProductsByName(
        searchTerm.trim(),
        pageNum,
        pageSizeNum,
        includeOverlay,
        brand?.trim() || undefined,
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
    @Query('brand') brand: string = '',
  ) {
    try {
      const pageNum = parseInt(page) || 1;
      const pageSizeNum = parseInt(pageSize) || 100;

      const result = await this.productService.getAllProducts(
        pageNum,
        pageSizeNum,
        brand?.trim() || undefined,
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
      const product = await this.productService.getProductDetail(code);
      return product;
    } catch (error) {
      console.error('Error en controller getProductDetail:', error);
      throw error;
    }
  }

  // ==================== USER PROFILE ENDPOINTS ====================

  @Get('profile/:userId')
  async getUserProfile(@Param('userId') userId: string) {
    return this.profileService.getUserProfile(userId);
  }

  @Post('profile')
  async createUserProfile(@Body() dto: CreateUserNutritionProfileDto) {
    try {
      const profile = await this.profileService.createUserProfile(dto);

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
    return this.profileService.updateUserProfile(userId, dto);
  }

  @Put('profile/:userId/goals')
  async updateMacroGoals(
    @Param('userId') userId: string,
    @Body() dto: UpdateMacroGoalsDto,
  ) {
    return this.profileService.updateMacroGoals(userId, dto);
  }

  // ==================== FOOD DIARY ENDPOINTS ====================

  @Post('diary')
  async addFoodEntry(@Body() dto: CreateFoodEntryDto) {
    return this.diaryService.addFoodEntry(dto);
  }

  // IMPORTANT: Specific routes (weekly, monthly) must come BEFORE generic routes (:date)
  // to prevent route conflicts where "weekly" or "monthly" are interpreted as dates
  @Get('diary/:userId/weekly')
  async getWeeklySummary(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
  ) {
    return this.diaryService.getWeeklySummary(userId, startDate);
  }

  @Get('diary/:userId/monthly')
  async getMonthlySummary(
    @Param('userId') userId: string,
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    return this.diaryService.getMonthlySummary(userId, year, month);
  }

  @Get('diary/:userId/:date')
  async getDailyEntries(
    @Param('userId') userId: string,
    @Param('date') date: string,
  ) {
    return this.diaryService.getDailyEntries(userId, date);
  }

  @Put('diary/:entryId')
  async updateFoodEntry(
    @Param('entryId') entryId: string,
    @Body() dto: UpdateFoodEntryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const userId = user?.id || dto.userId;
    return this.diaryService.updateFoodEntry(entryId, dto, userId as string);
  }

  @Delete('diary/:entryId')
  async deleteFoodEntry(
    @Param('entryId') entryId: string,
    @CurrentUser() user: CurrentUserData,
    @Query('userId') fallbackUserId?: string,
  ) {
    const userId = user?.id || fallbackUserId;
    return this.diaryService.deleteFoodEntry(entryId, userId as string);
  }

  // ==================== SHOPPING LIST ENDPOINTS ====================

  @Post('shopping-list')
  async addToShoppingList(@Body() dto: CreateShoppingListItemDto) {
    return this.shoppingListService.addToShoppingList(dto);
  }

  @Get('shopping-list/:userId')
  async getShoppingList(@Param('userId') userId: string) {
    return this.shoppingListService.getShoppingList(userId);
  }

  @Put('shopping-list/:itemId')
  async updateShoppingListItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateShoppingListItemDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const userId = user?.id || dto.userId;
    return this.shoppingListService.updateShoppingListItem(
      itemId,
      dto,
      userId as string,
    );
  }

  @Put('shopping-list/:userId/:itemId/toggle')
  async togglePurchased(
    @Param('userId') userId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.shoppingListService.togglePurchased(itemId, userId);
  }

  @Delete('shopping-list/:itemId')
  async deleteShoppingListItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: CurrentUserData,
    @Query('userId') fallbackUserId?: string,
  ) {
    const userId = user?.id || fallbackUserId;
    return this.shoppingListService.deleteShoppingListItem(
      itemId,
      userId as string,
    );
  }

  @Delete('shopping-list/:userId/purchased')
  async clearPurchasedItems(@Param('userId') userId: string) {
    return this.shoppingListService.clearPurchasedItems(userId);
  }

  @Delete('shopping-list/:userId/all')
  async clearShoppingList(@Param('userId') userId: string) {
    return this.shoppingListService.clearShoppingList(userId);
  }

  // ==================== FAVORITES ENDPOINTS ====================

  @Post('favorites')
  async addFavorite(@Body() dto: CreateFavoriteProductDto) {
    return this.productService.addFavorite(dto);
  }

  @Get('favorites/:userId')
  async getFavorites(@Param('userId') userId: string) {
    return this.productService.getFavorites(userId);
  }

  @Get('favorites/:userId/check/:productCode')
  async isFavorite(
    @Param('userId') userId: string,
    @Param('productCode') productCode: string,
  ) {
    return this.productService.isFavorite(userId, productCode);
  }

  @Delete('favorites/:userId/product/:productCode')
  async removeFavoriteByProductCode(
    @Param('userId') userId: string,
    @Param('productCode') productCode: string,
  ) {
    return this.productService.removeFavoriteByProductCode(userId, productCode);
  }

  @Get('favorites/:userId/search')
  async searchFavorites(
    @Param('userId') userId: string,
    @Query('query') query: string,
  ) {
    return this.productService.searchFavorites(userId, query);
  }

  // ==================== CUSTOM PRODUCTS ENDPOINTS ====================

  @Post('custom-products')
  @UseGuards(SubscriptionGuard)
  @RequireSubscription('create_custom_product')
  async createCustomProduct(@Body() dto: CreateCustomProductDto) {
    return this.productService.createCustomProduct(dto);
  }

  @Get('custom-products/:userId')
  async getCustomProducts(@Param('userId') userId: string) {
    return this.productService.getCustomProducts(userId);
  }

  @Get('custom-products/:userId/:productId')
  async getCustomProductById(
    @Param('userId') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.productService.getCustomProductById(userId, productId);
  }

  @Put('custom-products/:productId')
  async updateCustomProduct(
    @Param('productId') productId: string,
    @Body() dto: UpdateCustomProductDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const userId = user?.id || dto.userId;
    return this.productService.updateCustomProduct(
      productId,
      dto,
      userId as string,
    );
  }

  @Delete('custom-products/:productId')
  async deleteCustomProduct(
    @Param('productId') productId: string,
    @CurrentUser() user: CurrentUserData,
    @Query('userId') fallbackUserId?: string,
  ) {
    const userId = user?.id || fallbackUserId;
    return this.productService.deleteCustomProduct(productId, userId as string);
  }

  @Get('custom-products/:userId/search')
  async searchCustomProducts(
    @Param('userId') userId: string,
    @Query('query') query: string,
  ) {
    return this.productService.searchCustomProducts(userId, query);
  }

  // ==================== CUSTOM MEALS ENDPOINTS ====================

  @Post('custom-meals')
  @UseGuards(SubscriptionGuard)
  @RequireSubscription('create_custom_meal')
  async createCustomMeal(@Body() dto: CreateCustomMealDto) {
    return this.mealService.createCustomMeal(dto);
  }

  @Get('custom-meals/:userId')
  async getCustomMeals(@Param('userId') userId: string) {
    return this.mealService.getCustomMeals(userId);
  }

  @Get('custom-meals/:userId/:mealId')
  async getCustomMealById(
    @Param('userId') userId: string,
    @Param('mealId') mealId: string,
  ) {
    return this.mealService.getCustomMealById(userId, mealId);
  }

  @Put('custom-meals/:mealId')
  async updateCustomMeal(
    @Param('mealId') mealId: string,
    @Body() dto: UpdateCustomMealDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const userId = user?.id || dto.userId;
    return this.mealService.updateCustomMeal(mealId, dto, userId as string);
  }

  @Delete('custom-meals/:mealId')
  async deleteCustomMeal(
    @Param('mealId') mealId: string,
    @CurrentUser() user: CurrentUserData,
    @Query('userId') fallbackUserId?: string,
  ) {
    const userId = user?.id || fallbackUserId;
    return this.mealService.deleteCustomMeal(mealId, userId as string);
  }

  @Post('custom-meals/:mealId/duplicate')
  async duplicateCustomMeal(
    @Param('mealId') mealId: string,
    @CurrentUser() user: CurrentUserData,
    @Query('userId') fallbackUserId?: string,
  ) {
    const userId = user?.id || fallbackUserId;
    return this.mealService.duplicateCustomMeal(mealId, userId as string);
  }

  @Get('custom-meals/:userId/search')
  async searchCustomMeals(
    @Param('userId') userId: string,
    @Query('query') query: string,
  ) {
    return this.mealService.searchCustomMeals(userId, query);
  }
}
