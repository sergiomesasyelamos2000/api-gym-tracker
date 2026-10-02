import {
  CreateCustomMealDto,
  CustomMealEntity,
  CustomMealListItemDto,
  CustomMealResponseDto,
  MealImageKind,
  MealImageSource,
  MealProductDto,
  UpdateCustomMealDto,
} from '@app/entity-data-models';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import cloudinary from '../../../../config/cloudinary.config';
import {
  collectMealProductImageUrls,
  inferLegacyMealImageSource,
} from '../utils/meal-collage-layout.util';
import { MealCollageService } from './meal-collage.service';

type ResolvedMealImage = {
  url: string | null;
  source: MealImageSource | null;
};

@Injectable()
export class MealService {
  private readonly logger = new Logger(MealService.name);

  constructor(
    @InjectRepository(CustomMealEntity)
    private readonly customMealRepo: Repository<CustomMealEntity>,
    private readonly mealCollageService: MealCollageService,
  ) {}

  async createCustomMeal(
    dto: CreateCustomMealDto,
  ): Promise<CustomMealResponseDto> {
    try {
      const resolved = await this.resolveMealImageForCreate(dto);
      const totals = this.calculateMealTotals(dto.products);

      const meal = this.customMealRepo.create({
        userId: dto.userId,
        name: dto.name,
        description: dto.description,
        image: resolved.url ?? undefined,
        imageSource: resolved.source,
        products: dto.products,
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat,
        totalSugar: totals.sugar,
        totalFiber: totals.fiber,
        totalSodium: totals.sodium,
      });

      const saved = await this.customMealRepo.save(meal);
      return this.mapCustomMealToDto(saved);
    } catch (error) {
      console.error('Error creating custom meal:', error);
      throw error;
    }
  }

  async getCustomMeals(userId: string): Promise<CustomMealListItemDto[]> {
    const meals = await this.customMealRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return meals.map(meal => this.mapCustomMealToListDto(meal));
  }

  async getCustomMealById(
    userId: string,
    mealId: string,
  ): Promise<CustomMealResponseDto> {
    const meal = await this.customMealRepo.findOne({
      where: { id: mealId, userId },
    });

    if (!meal) {
      throw new NotFoundException(
        `Comida personalizada no encontrada: ${mealId}`,
      );
    }

    return this.mapCustomMealToDto(meal);
  }

  async updateCustomMeal(
    mealId: string,
    dto: UpdateCustomMealDto,
    userId: string,
  ): Promise<CustomMealResponseDto> {
    const meal = await this.customMealRepo.findOne({
      where: { id: mealId },
    });

    if (!meal) {
      throw new NotFoundException(
        `Comida personalizada no encontrada: ${mealId}`,
      );
    }

    if (meal.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para modificar esta comida',
      );
    }

    const resolved = await this.resolveMealImageForUpdate(meal, dto);

    if (dto.name !== undefined) meal.name = dto.name;
    if (dto.description !== undefined) meal.description = dto.description;

    if (resolved) {
      if (
        meal.image &&
        meal.image !== resolved.url &&
        meal.image.includes('cloudinary.com')
      ) {
        const publicId = this.extractPublicIdFromUrl(meal.image);
        await this.deleteFromCloudinary(publicId);
      }
      meal.image = resolved.url ?? undefined;
      meal.imageSource = resolved.source;
    }

    if (dto.products !== undefined) {
      meal.products = dto.products;
      const totals = this.calculateMealTotals(dto.products);
      meal.totalCalories = totals.calories;
      meal.totalProtein = totals.protein;
      meal.totalCarbs = totals.carbs;
      meal.totalFat = totals.fat;
      meal.totalSugar = totals.sugar;
      meal.totalFiber = totals.fiber;
      meal.totalSodium = totals.sodium;
    }

    const updated = await this.customMealRepo.save(meal);
    return this.mapCustomMealToDto(updated);
  }

  async searchCustomMeals(
    userId: string,
    searchTerm: string,
  ): Promise<CustomMealListItemDto[]> {
    const meals = await this.customMealRepo
      .createQueryBuilder('meal')
      .where('meal.userId = :userId', { userId })
      .andWhere('LOWER(meal.name) LIKE LOWER(:searchTerm)', {
        searchTerm: `%${searchTerm}%`,
      })
      .orderBy('meal.createdAt', 'DESC')
      .getMany();

    return meals.map(meal => this.mapCustomMealToListDto(meal));
  }

  async duplicateCustomMeal(
    mealId: string,
    userId: string,
  ): Promise<CustomMealResponseDto> {
    const originalMeal = await this.customMealRepo.findOne({
      where: { id: mealId },
    });

    if (!originalMeal) {
      throw new NotFoundException(
        `Comida personalizada no encontrada: ${mealId}`,
      );
    }

    if (originalMeal.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para duplicar esta comida',
      );
    }

    const duplicatedMeal = this.customMealRepo.create({
      userId: originalMeal.userId,
      name: `${originalMeal.name} (Copia)`,
      description: originalMeal.description,
      image: originalMeal.image,
      imageSource: originalMeal.imageSource,
      products: originalMeal.products,
      totalCalories: originalMeal.totalCalories,
      totalProtein: originalMeal.totalProtein,
      totalCarbs: originalMeal.totalCarbs,
      totalFat: originalMeal.totalFat,
      totalSugar: originalMeal.totalSugar,
      totalFiber: originalMeal.totalFiber,
      totalSodium: originalMeal.totalSodium,
    });

    const saved = await this.customMealRepo.save(duplicatedMeal);
    return this.mapCustomMealToDto(saved);
  }

  async deleteCustomMeal(mealId: string, userId: string): Promise<void> {
    const meal = await this.customMealRepo.findOne({
      where: { id: mealId },
    });

    if (!meal) {
      throw new NotFoundException(
        `Comida personalizada no encontrada: ${mealId}`,
      );
    }

    if (meal.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para eliminar esta comida',
      );
    }

    if (meal.image && meal.image.includes('cloudinary.com')) {
      const publicId = this.extractPublicIdFromUrl(meal.image);
      await this.deleteFromCloudinary(publicId);
    }

    await this.customMealRepo.delete(mealId);
  }

  async getCustomMealsCount(userId: string): Promise<number> {
    return this.customMealRepo.count({ where: { userId } });
  }

  async validateCustomMealOwnership(
    mealId: string,
    userId: string,
  ): Promise<boolean> {
    const meal = await this.customMealRepo.findOne({
      where: { id: mealId },
    });

    if (!meal) {
      throw new NotFoundException(
        `Comida personalizada no encontrada: ${mealId}`,
      );
    }

    if (meal.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para acceder a esta comida',
      );
    }

    return true;
  }

  private async resolveMealImageForCreate(
    dto: CreateCustomMealDto,
  ): Promise<ResolvedMealImage> {
    const kind: MealImageKind = dto.imageKind ?? 'auto';

    if (kind === 'user') {
      return this.resolveUserImage(dto.image);
    }

    return this.buildCollageImage(dto.products);
  }

  private async resolveMealImageForUpdate(
    meal: CustomMealEntity,
    dto: UpdateCustomMealDto,
  ): Promise<ResolvedMealImage | null> {
    const kind: MealImageKind = dto.imageKind ?? 'auto';
    const effectiveSource: MealImageSource =
      meal.imageSource ??
      inferLegacyMealImageSource({
        image: meal.image,
        products: meal.products,
      });

    if (kind === 'user') {
      if (typeof dto.image === 'string') {
        return this.resolveUserImage(dto.image);
      }
      // Keep existing user cover; stamp imageSource on legacy rows
      if (effectiveSource === 'user' && meal.image && meal.imageSource == null) {
        return { url: meal.image, source: 'user' };
      }
      return null;
    }

    // auto: explicit clear of a user photo → rebuild collage
    if (dto.image === null && effectiveSource === 'user') {
      return this.buildCollageImageOrKeep(meal, dto.products ?? meal.products);
    }

    if (effectiveSource === 'user') {
      return null;
    }

    // collage / legacy-collage: rebuild only when product image inputs change
    if (dto.products !== undefined) {
      const previousUrls = collectMealProductImageUrls(meal.products).join('|');
      const nextUrls = collectMealProductImageUrls(dto.products).join('|');
      if (previousUrls !== nextUrls) {
        return this.buildCollageImageOrKeep(meal, dto.products);
      }
      // Stamp imageSource on legacy first-product covers without regenerating
      if (meal.imageSource == null && meal.image) {
        return { url: meal.image, source: 'collage' };
      }
    }

    return null;
  }

  private async resolveUserImage(
    image: string | null | undefined,
  ): Promise<ResolvedMealImage> {
    if (!image) {
      return { url: null, source: null };
    }
    if (image.startsWith('data:image')) {
      const url = await this.uploadToCloudinary(image, 'meals');
      return { url, source: 'user' };
    }
    return { url: image, source: 'user' };
  }

  /**
   * Build a collage; on failure keep the previous meal cover instead of wiping it.
   */
  private async buildCollageImageOrKeep(
    meal: CustomMealEntity,
    products: MealProductDto[],
  ): Promise<ResolvedMealImage | null> {
    const urls = collectMealProductImageUrls(products);
    if (urls.length === 0) {
      // No product images left — clear cover intentionally
      return { url: null, source: null };
    }

    try {
      const buffer = await this.mealCollageService.buildCollageFromUrls(urls);
      if (!buffer) {
        this.logger.warn(
          'Meal collage rebuild failed; keeping existing meal image',
        );
        return null;
      }
      const url = await this.uploadBufferToCloudinary(buffer, 'meals');
      return { url, source: 'collage' };
    } catch (error) {
      this.logger.error(
        'Soft-fail: could not build/upload meal collage; keeping existing',
        error as Error,
      );
      return null;
    }
  }

  private async buildCollageImage(
    products: MealProductDto[],
  ): Promise<ResolvedMealImage> {
    const urls = collectMealProductImageUrls(products);
    if (urls.length === 0) {
      return { url: null, source: null };
    }

    try {
      const buffer = await this.mealCollageService.buildCollageFromUrls(urls);
      if (!buffer) {
        return { url: null, source: null };
      }
      const url = await this.uploadBufferToCloudinary(buffer, 'meals');
      return { url, source: 'collage' };
    } catch (error) {
      this.logger.error(
        'Soft-fail: could not build/upload meal collage',
        error as Error,
      );
      return { url: null, source: null };
    }
  }

  private mapCustomMealToDto(meal: CustomMealEntity): CustomMealResponseDto {
    return {
      id: meal.id,
      userId: meal.userId,
      name: meal.name,
      description: meal.description,
      image: meal.image,
      imageSource: meal.imageSource ?? null,
      products: meal.products,
      totalCalories: Number(meal.totalCalories),
      totalProtein: Number(meal.totalProtein),
      totalCarbs: Number(meal.totalCarbs),
      totalFat: Number(meal.totalFat),
      totalSugar: meal.totalSugar ? Number(meal.totalSugar) : null,
      totalFiber: meal.totalFiber ? Number(meal.totalFiber) : null,
      totalSodium: meal.totalSodium ? Number(meal.totalSodium) : null,
      createdAt: meal.createdAt,
      updatedAt: meal.updatedAt,
    };
  }

  private mapCustomMealToListDto(
    meal: CustomMealEntity,
  ): CustomMealListItemDto {
    return {
      id: meal.id,
      userId: meal.userId,
      name: meal.name,
      description: meal.description,
      image: meal.image,
      imageSource: meal.imageSource ?? null,
      productCount: Array.isArray(meal.products) ? meal.products.length : 0,
      totalCalories: Number(meal.totalCalories),
      totalProtein: Number(meal.totalProtein),
      totalCarbs: Number(meal.totalCarbs),
      totalFat: Number(meal.totalFat),
      totalSugar: meal.totalSugar ? Number(meal.totalSugar) : null,
      totalFiber: meal.totalFiber ? Number(meal.totalFiber) : null,
      totalSodium: meal.totalSodium ? Number(meal.totalSodium) : null,
      createdAt: meal.createdAt,
      updatedAt: meal.updatedAt,
    };
  }

  private calculateMealTotals(products: MealProductDto[]): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugar: number;
    fiber: number;
    sodium: number;
  } {
    return products.reduce(
      (totals, product) => ({
        calories: totals.calories + Number(product.calories),
        protein: totals.protein + Number(product.protein),
        carbs: totals.carbs + Number(product.carbs),
        fat: totals.fat + Number(product.fat),
        sugar: totals.sugar + (product.sugar ? Number(product.sugar) : 0),
        fiber: totals.fiber + (product.fiber ? Number(product.fiber) : 0),
        sodium: totals.sodium + (product.sodium ? Number(product.sodium) : 0),
      }),
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        sugar: 0,
        fiber: 0,
        sodium: 0,
      },
    );
  }

  private async uploadToCloudinary(
    base64Image: string,
    folder: string,
  ): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(base64Image, {
        folder: `nutrition/${folder}`,
        resource_type: 'auto',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      });

      return result.secure_url;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw new Error('No se pudo subir la imagen');
    }
  }

  private async uploadBufferToCloudinary(
    buffer: Buffer,
    folder: string,
  ): Promise<string> {
    const dataUri = `data:image/png;base64,${buffer.toString('base64')}`;
    return this.uploadToCloudinary(dataUri, folder);
  }

  private extractPublicIdFromUrl(url: string): string {
    const matches = url.match(/nutrition\/(products|meals)\/[^.]+/);
    return matches ? matches[0] : '';
  }

  private async deleteFromCloudinary(publicId: string): Promise<void> {
    try {
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
    }
  }
}
