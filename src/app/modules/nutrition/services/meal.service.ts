import {
  CreateCustomMealDto,
  CustomMealEntity,
  CustomMealResponseDto,
  MealProductDto,
  UpdateCustomMealDto,
} from '@app/entity-data-models';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import cloudinary from '../../../../config/cloudinary.config';

@Injectable()
export class MealService {
  constructor(
    @InjectRepository(CustomMealEntity)
    private readonly customMealRepo: Repository<CustomMealEntity>,
  ) {}

  async createCustomMeal(
    dto: CreateCustomMealDto,
  ): Promise<CustomMealResponseDto> {
    try {
      let imageUrl: string | undefined = undefined;
      if (dto.image && dto.image.startsWith('data:image')) {
        imageUrl = await this.uploadToCloudinary(dto.image, 'meals');
      } else if (dto.image) {
        imageUrl = dto.image;
      }

      const totals = this.calculateMealTotals(dto.products);

      const meal = this.customMealRepo.create({
        userId: dto.userId,
        name: dto.name,
        description: dto.description,
        image: imageUrl,
        products: dto.products,
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat,
      });

      const saved = await this.customMealRepo.save(meal);
      return this.mapCustomMealToDto(saved);
    } catch (error) {
      console.error('Error creating custom meal:', error);
      throw error;
    }
  }

  async getCustomMeals(userId: string): Promise<CustomMealResponseDto[]> {
    const meals = await this.customMealRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return meals.map(meal => this.mapCustomMealToDto(meal));
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

    let imageUrl = meal.image;
    if (dto.image && dto.image.startsWith('data:image')) {
      if (meal.image && meal.image.includes('cloudinary.com')) {
        const publicId = this.extractPublicIdFromUrl(meal.image);
        await this.deleteFromCloudinary(publicId);
      }
      imageUrl = await this.uploadToCloudinary(dto.image, 'meals');
    } else if (dto.image !== undefined) {
      imageUrl = dto.image;
    }

    if (dto.name !== undefined) meal.name = dto.name;
    if (dto.description !== undefined) meal.description = dto.description;
    meal.image = imageUrl;
    if (dto.products !== undefined) {
      meal.products = dto.products;
      const totals = this.calculateMealTotals(dto.products);
      meal.totalCalories = totals.calories;
      meal.totalProtein = totals.protein;
      meal.totalCarbs = totals.carbs;
      meal.totalFat = totals.fat;
    }

    const updated = await this.customMealRepo.save(meal);
    return this.mapCustomMealToDto(updated);
  }

  async searchCustomMeals(
    userId: string,
    searchTerm: string,
  ): Promise<CustomMealResponseDto[]> {
    const meals = await this.customMealRepo
      .createQueryBuilder('meal')
      .where('meal.userId = :userId', { userId })
      .andWhere('LOWER(meal.name) LIKE LOWER(:searchTerm)', {
        searchTerm: `%${searchTerm}%`,
      })
      .orderBy('meal.createdAt', 'DESC')
      .getMany();

    return meals.map(meal => this.mapCustomMealToDto(meal));
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
      products: originalMeal.products,
      totalCalories: originalMeal.totalCalories,
      totalProtein: originalMeal.totalProtein,
      totalCarbs: originalMeal.totalCarbs,
      totalFat: originalMeal.totalFat,
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

  private mapCustomMealToDto(meal: CustomMealEntity): CustomMealResponseDto {
    return {
      id: meal.id,
      userId: meal.userId,
      name: meal.name,
      description: meal.description,
      image: meal.image,
      products: meal.products,
      totalCalories: Number(meal.totalCalories),
      totalProtein: Number(meal.totalProtein),
      totalCarbs: Number(meal.totalCarbs),
      totalFat: Number(meal.totalFat),
      createdAt: meal.createdAt,
      updatedAt: meal.updatedAt,
    };
  }

  private calculateMealTotals(products: MealProductDto[]): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } {
    return products.reduce(
      (totals, product) => ({
        calories: totals.calories + Number(product.calories),
        protein: totals.protein + Number(product.protein),
        carbs: totals.carbs + Number(product.carbs),
        fat: totals.fat + Number(product.fat),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
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
