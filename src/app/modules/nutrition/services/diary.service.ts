import {
  CreateFoodEntryDto,
  DailyNutritionSummaryDto,
  FoodEntryEntity,
  FoodEntryResponseDto,
  UpdateFoodEntryDto,
  UserNutritionProfileEntity,
} from '@app/entity-data-models';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

const DEFAULT_GOALS = {
  dailyCalories: 2000,
  protein: 150,
  carbs: 200,
  fat: 65,
};

@Injectable()
export class DiaryService {
  constructor(
    @InjectRepository(FoodEntryEntity)
    private readonly foodEntryRepo: Repository<FoodEntryEntity>,
    @InjectRepository(UserNutritionProfileEntity)
    private readonly userProfileRepo: Repository<UserNutritionProfileEntity>,
  ) {}

  async addFoodEntry(dto: CreateFoodEntryDto): Promise<FoodEntryResponseDto> {
    const entry = this.foodEntryRepo.create(dto);
    const saved = await this.foodEntryRepo.save(entry);
    return this.mapFoodEntryToDto(saved);
  }

  async getDailyEntries(
    userId: string,
    date: string,
  ): Promise<DailyNutritionSummaryDto> {
    const [summary] = await this.buildSummariesForRange(userId, date, date);
    return summary;
  }

  async updateFoodEntry(
    entryId: string,
    dto: UpdateFoodEntryDto,
    userId: string,
  ): Promise<FoodEntryResponseDto> {
    const entry = await this.foodEntryRepo.findOne({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundException(`Entrada no encontrada: ${entryId}`);
    }

    if (entry.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para modificar esta entrada',
      );
    }

    if (dto.quantity !== undefined) entry.quantity = dto.quantity;
    if (dto.unit !== undefined) entry.unit = dto.unit;
    if (dto.customUnitName !== undefined)
      entry.customUnitName = dto.customUnitName;
    if (dto.customUnitGrams !== undefined)
      entry.customUnitGrams = dto.customUnitGrams;
    if (dto.mealType !== undefined) entry.mealType = dto.mealType;
    if (dto.calories !== undefined) entry.calories = dto.calories;
    if (dto.protein !== undefined) entry.protein = dto.protein;
    if (dto.carbs !== undefined) entry.carbs = dto.carbs;
    if (dto.fat !== undefined) entry.fat = dto.fat;
    if (dto.sugar !== undefined) entry.sugar = dto.sugar;
    if (dto.fiber !== undefined) entry.fiber = dto.fiber;
    if (dto.sodium !== undefined) entry.sodium = dto.sodium;

    const updated = await this.foodEntryRepo.save(entry);
    return this.mapFoodEntryToDto(updated);
  }

  async deleteFoodEntry(entryId: string, userId: string): Promise<void> {
    const entry = await this.foodEntryRepo.findOne({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundException(`Entrada no encontrada: ${entryId}`);
    }

    if (entry.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para eliminar esta entrada',
      );
    }

    await this.foodEntryRepo.delete(entryId);
  }

  async getWeeklySummary(
    userId: string,
    startDate: string,
  ): Promise<DailyNutritionSummaryDto[]> {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const endDate = end.toISOString().split('T')[0];

    return this.buildSummariesForRange(userId, startDate, endDate);
  }

  async getMonthlySummary(
    userId: string,
    year: number,
    month: number,
  ): Promise<DailyNutritionSummaryDto[]> {
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    return this.buildSummariesForRange(userId, startDate, endDate);
  }

  /**
   * One range query for entries + one profile fetch; fill every day in range.
   */
  private async buildSummariesForRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<DailyNutritionSummaryDto[]> {
    const [entries, profile] = await Promise.all([
      this.foodEntryRepo.find({
        where: {
          userId,
          date: Between(startDate, endDate),
        },
        order: { date: 'ASC', createdAt: 'ASC' },
      }),
      this.userProfileRepo.findOne({ where: { userId } }),
    ]);

    const goals = profile
      ? {
          dailyCalories: profile.dailyCalories,
          protein: Number(profile.proteinGrams),
          carbs: Number(profile.carbsGrams),
          fat: Number(profile.fatGrams),
        }
      : DEFAULT_GOALS;
    const hasProfile = Boolean(profile);

    const byDate = new Map<string, FoodEntryEntity[]>();
    for (const entry of entries) {
      const list = byDate.get(entry.date) ?? [];
      byDate.set(entry.date, [...list, entry]);
    }

    const summaries: DailyNutritionSummaryDto[] = [];
    const cursor = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);

    while (cursor.getTime() <= end.getTime()) {
      const dateStr = cursor.toISOString().split('T')[0];
      const dayEntries = byDate.get(dateStr) ?? [];
      summaries.push({
        date: dateStr,
        entries: dayEntries.map(e => this.mapFoodEntryToDto(e)),
        totals: this.calculateTotals(dayEntries),
        goals,
        hasProfile,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return summaries;
  }

  private calculateTotals(entries: FoodEntryEntity[]) {
    return entries.reduce(
      (acc, entry) => ({
        calories: acc.calories + Number(entry.calories),
        protein: acc.protein + Number(entry.protein),
        carbs: acc.carbs + Number(entry.carbs),
        fat: acc.fat + Number(entry.fat),
        sugar: acc.sugar + (entry.sugar ? Number(entry.sugar) : 0),
        fiber: acc.fiber + (entry.fiber ? Number(entry.fiber) : 0),
        sodium: acc.sodium + (entry.sodium ? Number(entry.sodium) : 0),
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

  private mapFoodEntryToDto(entry: FoodEntryEntity): FoodEntryResponseDto {
    return {
      id: entry.id,
      userId: entry.userId,
      productCode: entry.productCode,
      productName: entry.productName,
      productImage: entry.productImage,
      date: entry.date,
      mealType: entry.mealType,
      quantity: Number(entry.quantity),
      unit: entry.unit,
      customUnitName: entry.customUnitName,
      customUnitGrams: entry.customUnitGrams
        ? Number(entry.customUnitGrams)
        : undefined,
      calories: Number(entry.calories),
      protein: Number(entry.protein),
      carbs: Number(entry.carbs),
      fat: Number(entry.fat),
      sugar: entry.sugar ? Number(entry.sugar) : undefined,
      fiber: entry.fiber ? Number(entry.fiber) : undefined,
      sodium: entry.sodium ? Number(entry.sodium) : undefined,
      createdAt: entry.createdAt,
    };
  }
}
