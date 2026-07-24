import {
  CreateNutritionPlanDto,
  GenerateNutritionPlanDto,
  GenerateNutritionPlanResponseDto,
  NutritionPlanDataDto,
  NutritionPlanDayDto,
  NutritionPlanEntity,
  NutritionPlanFoodItemDto,
  NutritionPlanMacroTotalsDto,
  NutritionPlanMealDto,
  NutritionPlanResponseDto,
  UpdateNutritionPlanDto,
  UserContext,
} from '@app/entity-data-models';
import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIService } from '../../../services/ai.service';
import { ChatMessage } from '../../../services/ai-provider.base';
import { NutritionService } from '../nutrition.service';

const DEFAULT_PLAN_DAYS = 7;
const MIN_PLAN_DAYS = 1;
const MAX_PLAN_DAYS = 30;
const AI_PROMPT_VERSION = 'nutrition-plan-v3';
const PLAN_AI_MAX_TOKENS = 4096;
const PLAN_AI_PRIMARY_TIMEOUT_MS = 90000;
const PLAN_AI_FALLBACK_TIMEOUT_MS = 90000;
const PLAN_AI_TEMPERATURE = 0.2;
const DAY_LABELS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

@Injectable()
export class NutritionPlanService {
  constructor(
    @InjectRepository(NutritionPlanEntity)
    private readonly nutritionPlanRepo: Repository<NutritionPlanEntity>,
    private readonly aiService: AIService,
    private readonly nutritionService: NutritionService,
  ) {}

  async generateFromAi(
    dto: GenerateNutritionPlanDto,
  ): Promise<GenerateNutritionPlanResponseDto> {
    const userId = (dto.userId || '').trim();
    if (!userId) {
      throw new BadRequestException('userId es obligatorio');
    }

    const durationDays = Number(dto.durationDays ?? DEFAULT_PLAN_DAYS);
    if (
      !Number.isInteger(durationDays) ||
      durationDays < MIN_PLAN_DAYS ||
      durationDays > MAX_PLAN_DAYS
    ) {
      throw new BadRequestException(
        `durationDays debe ser un entero entre ${MIN_PLAN_DAYS} y ${MAX_PLAN_DAYS}`,
      );
    }

    let userContext: UserContext | undefined;
    try {
      userContext = await this.nutritionService.getUserContext(userId);
    } catch {
      // keep undefined context, same behavior as chat
    }

    const dailyTargets = this.resolveDailyTargets(userContext);
    const prompt = this.buildTemplateDaysPrompt(dailyTargets, dto.preferences);
    const messages: ChatMessage[] = [{ role: 'user', content: prompt }];

    try {
      // One AI call for 2 compact archetype days, then expand locally.
      // Avoids quota burn from N day-by-day requests.
      const aiResponse = await this.aiService.chat(messages, userContext, {
        responseFormat: 'json',
        maxTokens: PLAN_AI_MAX_TOKENS,
        temperature: PLAN_AI_TEMPERATURE,
        primaryTimeoutMs: PLAN_AI_PRIMARY_TIMEOUT_MS,
        fallbackTimeoutMs: PLAN_AI_FALLBACK_TIMEOUT_MS,
      });

      const { trainingDay, restDay } = this.parseTemplateDays(
        aiResponse.content,
      );
      const days = this.expandTemplateDays(
        durationDays,
        trainingDay,
        restDay,
        userContext,
      );

      const planData: NutritionPlanDataDto = {
        version: 1,
        dailyTargets,
        days,
      };

      const response = await this.create({
        userId,
        name:
          dto.name?.trim() ||
          `Plan nutricional IA (${durationDays} días)`,
        description: 'Plan generado automáticamente con IA',
        status: 'draft',
        durationDays,
        planData: {
          ...planData,
          ai: {
            provider: aiResponse.provider,
            model: aiResponse.model,
            generatedAt: new Date().toISOString(),
            promptVersion: AI_PROMPT_VERSION,
          },
        },
        macroSnapshot: userContext?.profile?.goals
          ? {
              dailyCalories:
                Number(userContext.profile.goals.dailyCalories) || 0,
              protein: Number(userContext.profile.goals.protein) || 0,
              carbs: Number(userContext.profile.goals.carbs) || 0,
              fat: Number(userContext.profile.goals.fat) || 0,
            }
          : undefined,
      });

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const detail =
        error instanceof Error ? error.message : 'Error desconocido';
      throw new InternalServerErrorException(
        `No se pudo generar el plan nutricional automáticamente. ${detail}`,
      );
    }
  }

  async create(dto: CreateNutritionPlanDto): Promise<NutritionPlanResponseDto> {
    const planData = this.recalculatePlanTotals(dto.planData);
    const averages = this.calculatePlanAverages(planData);

    const plan = this.nutritionPlanRepo.create({
      userId: dto.userId,
      name: dto.name,
      description: dto.description,
      status: dto.status ?? 'draft',
      durationDays: dto.durationDays,
      planData,
      macroSnapshot: dto.macroSnapshot ?? null,
      avgDailyCalories: averages.calories,
      avgDailyProtein: averages.protein,
      avgDailyCarbs: averages.carbs,
      avgDailyFat: averages.fat,
    });

    const saved = await this.nutritionPlanRepo.save(plan);
    return this.mapPlanToDto(saved);
  }

  async findAllByUser(userId: string): Promise<NutritionPlanResponseDto[]> {
    const plans = await this.nutritionPlanRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return plans.map(plan => this.mapPlanToDto(plan));
  }

  async findActiveByUser(
    userId: string,
  ): Promise<NutritionPlanResponseDto | null> {
    const plan = await this.nutritionPlanRepo.findOne({
      where: { userId, status: 'active' },
      order: { updatedAt: 'DESC' },
    });

    return plan ? this.mapPlanToDto(plan) : null;
  }

  async findById(
    userId: string,
    planId: string,
  ): Promise<NutritionPlanResponseDto> {
    const plan = await this.nutritionPlanRepo.findOne({
      where: { id: planId, userId },
    });

    if (!plan) {
      throw new NotFoundException(
        `Plan nutricional no encontrado: ${planId}`,
      );
    }

    return this.mapPlanToDto(plan);
  }

  async update(
    planId: string,
    dto: UpdateNutritionPlanDto,
    userId: string,
  ): Promise<NutritionPlanResponseDto> {
    const plan = await this.nutritionPlanRepo.findOne({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException(
        `Plan nutricional no encontrado: ${planId}`,
      );
    }

    if (plan.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para modificar este plan',
      );
    }

    if (dto.name !== undefined) plan.name = dto.name;
    if (dto.description !== undefined) plan.description = dto.description;
    if (dto.durationDays !== undefined) plan.durationDays = dto.durationDays;

    if (dto.planData !== undefined) {
      plan.planData = this.recalculatePlanTotals(dto.planData);
      const averages = this.calculatePlanAverages(plan.planData);
      plan.avgDailyCalories = averages.calories;
      plan.avgDailyProtein = averages.protein;
      plan.avgDailyCarbs = averages.carbs;
      plan.avgDailyFat = averages.fat;
    }

    if (dto.status !== undefined) {
      if (dto.status === 'active') {
        await this.archiveActivePlansForUser(userId, planId);
      }
      plan.status = dto.status;
    }

    const updated = await this.nutritionPlanRepo.save(plan);
    return this.mapPlanToDto(updated);
  }

  async activate(
    planId: string,
    userId: string,
  ): Promise<NutritionPlanResponseDto> {
    const plan = await this.nutritionPlanRepo.findOne({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException(
        `Plan nutricional no encontrado: ${planId}`,
      );
    }

    if (plan.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para activar este plan',
      );
    }

    await this.archiveActivePlansForUser(userId, planId);
    plan.status = 'active';

    const updated = await this.nutritionPlanRepo.save(plan);
    return this.mapPlanToDto(updated);
  }

  async delete(planId: string, userId: string): Promise<void> {
    const plan = await this.nutritionPlanRepo.findOne({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException(
        `Plan nutricional no encontrado: ${planId}`,
      );
    }

    if (plan.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para eliminar este plan',
      );
    }

    await this.nutritionPlanRepo.delete(planId);
  }

  async getPlansCount(userId: string): Promise<number> {
    return this.nutritionPlanRepo.count({ where: { userId } });
  }

  private async archiveActivePlansForUser(
    userId: string,
    excludePlanId?: string,
  ): Promise<void> {
    const activePlans = await this.nutritionPlanRepo.find({
      where: { userId, status: 'active' },
    });

    const plansToArchive = excludePlanId
      ? activePlans.filter(plan => plan.id !== excludePlanId)
      : activePlans;

    if (plansToArchive.length === 0) {
      return;
    }

    for (const activePlan of plansToArchive) {
      activePlan.status = 'archived';
    }

    await this.nutritionPlanRepo.save(plansToArchive);
  }

  private mapPlanToDto(plan: NutritionPlanEntity): NutritionPlanResponseDto {
    return {
      id: plan.id,
      userId: plan.userId,
      name: plan.name,
      description: plan.description,
      status: plan.status,
      durationDays: plan.durationDays,
      planData: plan.planData,
      macroSnapshot: plan.macroSnapshot ?? null,
      avgDailyCalories: Number(plan.avgDailyCalories),
      avgDailyProtein: Number(plan.avgDailyProtein),
      avgDailyCarbs: Number(plan.avgDailyCarbs),
      avgDailyFat: Number(plan.avgDailyFat),
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  private calculatePlanAverages(planData: NutritionPlanDataDto): NutritionPlanMacroTotalsDto {
    if (!planData.days.length) {
      return {
        calories: Number(planData.dailyTargets.calories) || 0,
        protein: Number(planData.dailyTargets.protein) || 0,
        carbs: Number(planData.dailyTargets.carbs) || 0,
        fat: Number(planData.dailyTargets.fat) || 0,
      };
    }

    const totals = planData.days.reduce(
      (acc, day) => ({
        calories: acc.calories + Number(day.dailyTotals.calories),
        protein: acc.protein + Number(day.dailyTotals.protein),
        carbs: acc.carbs + Number(day.dailyTotals.carbs),
        fat: acc.fat + Number(day.dailyTotals.fat),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    const dayCount = planData.days.length;

    return {
      calories: Math.round((totals.calories / dayCount) * 10) / 10,
      protein: Math.round((totals.protein / dayCount) * 10) / 10,
      carbs: Math.round((totals.carbs / dayCount) * 10) / 10,
      fat: Math.round((totals.fat / dayCount) * 10) / 10,
    };
  }

  private recalculatePlanTotals(
    planData: NutritionPlanDataDto,
  ): NutritionPlanDataDto {
    if (!planData || typeof planData !== 'object') {
      throw new BadRequestException('planData inválido');
    }
    if (!Array.isArray(planData.days) || planData.days.length === 0) {
      throw new BadRequestException(
        'planData.days debe contener al menos un día',
      );
    }

    const days = planData.days.map(day => this.recalculateDayTotals(day));

    return {
      ...planData,
      version: 1,
      days,
    };
  }

  private recalculateDayTotals(day: NutritionPlanDayDto): NutritionPlanDayDto {
    if (!Array.isArray(day.meals) || day.meals.length === 0) {
      throw new BadRequestException(
        `El día ${day.dayIndex ?? '?'} no contiene comidas válidas`,
      );
    }

    const meals = day.meals.map(meal => this.recalculateMealTotals(meal));
    const dailyTotals = meals.reduce(
      (totals, meal) => ({
        calories: totals.calories + meal.totals.calories,
        protein: totals.protein + meal.totals.protein,
        carbs: totals.carbs + meal.totals.carbs,
        fat: totals.fat + meal.totals.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    return {
      ...day,
      meals,
      dailyTotals: {
        calories: Math.round(dailyTotals.calories * 10) / 10,
        protein: Math.round(dailyTotals.protein * 10) / 10,
        carbs: Math.round(dailyTotals.carbs * 10) / 10,
        fat: Math.round(dailyTotals.fat * 10) / 10,
      },
    };
  }

  private recalculateMealTotals(meal: NutritionPlanMealDto): NutritionPlanMealDto {
    if (!Array.isArray(meal.foods) || meal.foods.length === 0) {
      throw new BadRequestException(
        `La comida "${meal.name || 'sin nombre'}" no contiene alimentos válidos`,
      );
    }

    const totals = meal.foods.reduce(
      (acc, food) => ({
        calories: acc.calories + Number(food.calories),
        protein: acc.protein + Number(food.protein),
        carbs: acc.carbs + Number(food.carbs),
        fat: acc.fat + Number(food.fat),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    return {
      ...meal,
      totals: {
        calories: Math.round(totals.calories * 10) / 10,
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
      },
    };
  }

  private buildTemplateDaysPrompt(
    dailyTargets: NutritionPlanMacroTotalsDto,
    preferences?: {
      dietaryRestrictions?: string;
      excludedFoods?: string;
      additionalNotes?: string;
    },
  ): string {
    const restrictions = preferences?.dietaryRestrictions?.trim() || 'ninguna';
    const excludedFoods = preferences?.excludedFoods?.trim() || 'ninguno';
    const notes = preferences?.additionalNotes?.trim() || 'ninguna';

    return `Genera 2 días plantilla de un plan nutricional (uno de entrenamiento y uno de descanso).
Objetivo diario: ${dailyTargets.calories} kcal, P:${dailyTargets.protein}g, C:${dailyTargets.carbs}g, G:${dailyTargets.fat}g.

Devuelve SOLO JSON válido:
{
  "trainingDay": {
    "meals": [
      {
        "mealType": "breakfast|lunch|dinner|snack",
        "name": "string",
        "foods": [
          { "name": "string", "quantity": number, "unit": "g", "calories": number, "protein": number, "carbs": number, "fat": number }
        ],
        "totals": { "calories": number, "protein": number, "carbs": number, "fat": number }
      }
    ],
    "dailyTotals": { "calories": number, "protein": number, "carbs": number, "fat": number }
  },
  "restDay": { "meals": [], "dailyTotals": { "calories": number, "protein": number, "carbs": number, "fat": number } }
}

Reglas:
- Cada día: exactamente 4 comidas (breakfast, lunch, dinner, snack).
- 2-3 alimentos por comida, nombres cortos en español.
- trainingDay con un poco más de carbos que restDay.
- Sin markdown ni texto fuera del JSON.
- Restricciones: ${restrictions}
- Excluidos: ${excludedFoods}
- Notas: ${notes}`;
  }

  private parseTemplateDays(rawText: string): {
    trainingDay: NutritionPlanDayDto;
    restDay: NutritionPlanDayDto;
  } {
    const parsed = this.parseJsonFromModelResponse(rawText);
    if (!parsed || typeof parsed !== 'object') {
      const preview = (rawText || '').slice(0, 280).replace(/\s+/g, ' ');
      throw new BadRequestException(
        `La IA no devolvió un JSON válido para el plan.${preview ? ` Vista previa: ${preview}` : ''}`,
      );
    }

    const record = parsed as Record<string, unknown>;
    const trainingRaw = record.trainingDay ?? record.training_day;
    const restRaw = record.restDay ?? record.rest_day;

    if (!trainingRaw || !restRaw) {
      throw new BadRequestException(
        'El JSON debe incluir trainingDay y restDay.',
      );
    }

    return {
      trainingDay: this.parseDay(trainingRaw, 1),
      restDay: this.parseDay(restRaw, 2),
    };
  }

  private expandTemplateDays(
    durationDays: number,
    trainingDay: NutritionPlanDayDto,
    restDay: NutritionPlanDayDto,
    userContext?: UserContext,
  ): NutritionPlanDayDto[] {
    return Array.from({ length: durationDays }, (_, i) => {
      const dayIndex = i + 1;
      const label = DAY_LABELS[(dayIndex - 1) % DAY_LABELS.length];
      const isTrainingDay = this.isLikelyTrainingDay(dayIndex, userContext);
      const source = isTrainingDay ? trainingDay : restDay;

      return {
        dayIndex,
        label,
        isTrainingDay,
        meals: source.meals.map(meal => ({
          ...meal,
          foods: meal.foods.map(food => ({ ...food })),
          totals: { ...meal.totals },
        })),
        dailyTotals: { ...source.dailyTotals },
      };
    });
  }

  private resolveDailyTargets(
    userContext?: UserContext,
  ): NutritionPlanMacroTotalsDto {
    const goals = userContext?.profile?.goals;
    return {
      calories: Number(goals?.dailyCalories) || 2200,
      protein: Number(goals?.protein) || 140,
      carbs: Number(goals?.carbs) || 220,
      fat: Number(goals?.fat) || 70,
    };
  }

  private isLikelyTrainingDay(
    dayIndex: number,
    userContext?: UserContext,
  ): boolean {
    const frequentDays = userContext?.training?.schedule?.frequentDays;
    if (Array.isArray(frequentDays) && frequentDays.length > 0) {
      const label = DAY_LABELS[(dayIndex - 1) % DAY_LABELS.length];
      const normalized = new Set(
        frequentDays.map(day => day.trim().toLowerCase()),
      );
      return (
        normalized.has(label.toLowerCase()) ||
        normalized.has(label.slice(0, 3).toLowerCase())
      );
    }

    // Default: train Mon/Wed/Fri/Sat style pattern
    return [1, 3, 5, 6].includes(((dayIndex - 1) % 7) + 1);
  }

  private parseGeneratedPlan(
    rawText: string,
    expectedDurationDays: number,
  ): NutritionPlanDataDto {
    const parsed = this.parseJsonFromModelResponse(rawText);
    if (!parsed || typeof parsed !== 'object') {
      const preview = (rawText || '').slice(0, 280).replace(/\s+/g, ' ');
      throw new BadRequestException(
        `La IA no devolvió un JSON válido para el plan.${preview ? ` Vista previa: ${preview}` : ''}`,
      );
    }

    const record = parsed as Record<string, unknown>;
    const dailyTargets = this.parseMacroTotals(record.dailyTargets, 'dailyTargets');
    const rawDays = record.days;
    if (!Array.isArray(rawDays)) {
      throw new BadRequestException('El JSON generado no contiene days[] válido.');
    }
    if (rawDays.length !== expectedDurationDays) {
      throw new BadRequestException(
        `El plan debe contener exactamente ${expectedDurationDays} días.`,
      );
    }

    const days = rawDays.map((rawDay, idx) => this.parseDay(rawDay, idx + 1));

    return {
      version: 1,
      dailyTargets,
      days,
    };
  }

  private parseDay(rawDay: unknown, fallbackIndex: number): NutritionPlanDayDto {
    if (!rawDay || typeof rawDay !== 'object') {
      throw new BadRequestException(`Día inválido en posición ${fallbackIndex}.`);
    }

    const day = rawDay as Record<string, unknown>;
    const mealsRaw = day.meals;
    if (!Array.isArray(mealsRaw) || mealsRaw.length === 0) {
      throw new BadRequestException(`El día ${fallbackIndex} no contiene meals[] válido.`);
    }

    const meals = mealsRaw.map(rawMeal => this.parseMeal(rawMeal));

    return {
      dayIndex: this.toFiniteNumber(day.dayIndex, `days[${fallbackIndex}].dayIndex`) ?? fallbackIndex,
      label: this.toNonEmptyString(day.label, `days[${fallbackIndex}].label`) || `Día ${fallbackIndex}`,
      isTrainingDay: Boolean(day.isTrainingDay),
      meals,
      dailyTotals: this.parseMacroTotals(day.dailyTotals, `days[${fallbackIndex}].dailyTotals`),
    };
  }

  private parseMeal(rawMeal: unknown): NutritionPlanMealDto {
    if (!rawMeal || typeof rawMeal !== 'object') {
      throw new BadRequestException('Meal inválido en plan generado.');
    }
    const meal = rawMeal as Record<string, unknown>;
    const mealType = this.toNonEmptyString(meal.mealType, 'meal.mealType');
    if (!mealType || !['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
      throw new BadRequestException('mealType inválido; usa breakfast|lunch|dinner|snack.');
    }

    const foodsRaw = meal.foods;
    if (!Array.isArray(foodsRaw) || foodsRaw.length === 0) {
      throw new BadRequestException('Cada meal debe incluir foods[] con elementos.');
    }

    const foods = foodsRaw.map(rawFood => this.parseFood(rawFood));

    return {
      mealType: mealType as NutritionPlanMealDto['mealType'],
      name: this.toNonEmptyString(meal.name, 'meal.name') || 'Comida',
      foods,
      totals: this.parseMacroTotals(meal.totals, 'meal.totals'),
      instructions: this.toOptionalString(meal.instructions),
    };
  }

  private parseFood(rawFood: unknown): NutritionPlanFoodItemDto {
    if (!rawFood || typeof rawFood !== 'object') {
      throw new BadRequestException('Food inválido en plan generado.');
    }
    const food = rawFood as Record<string, unknown>;

    const quantity = this.toFiniteNumber(food.quantity, 'food.quantity');
    if (quantity === null || quantity <= 0) {
      throw new BadRequestException('food.quantity debe ser un número positivo.');
    }

    return {
      name: this.toNonEmptyString(food.name, 'food.name') || 'Alimento',
      quantity,
      unit: this.toNonEmptyString(food.unit, 'food.unit') || 'gram',
      calories: this.requirePositiveNumber(food.calories, 'food.calories'),
      protein: this.requirePositiveNumber(food.protein, 'food.protein'),
      carbs: this.requirePositiveNumber(food.carbs, 'food.carbs'),
      fat: this.requirePositiveNumber(food.fat, 'food.fat'),
      notes: this.toOptionalString(food.notes),
    };
  }

  private parseMacroTotals(
    value: unknown,
    fieldPath: string,
  ): NutritionPlanMacroTotalsDto {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException(`${fieldPath} debe ser un objeto válido.`);
    }
    const totals = value as Record<string, unknown>;
    return {
      calories: this.requirePositiveNumber(totals.calories, `${fieldPath}.calories`),
      protein: this.requirePositiveNumber(totals.protein, `${fieldPath}.protein`),
      carbs: this.requirePositiveNumber(totals.carbs, `${fieldPath}.carbs`),
      fat: this.requirePositiveNumber(totals.fat, `${fieldPath}.fat`),
    };
  }

  private parseJsonFromModelResponse(rawText: string): unknown {
    if (!rawText) return null;

    const cleaned = rawText.trim();
    const fencedMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonCandidate = fencedMatch?.[1]?.trim() || cleaned;

    try {
      return JSON.parse(jsonCandidate);
    } catch {
      const firstBrace = jsonCandidate.indexOf('{');
      const lastBrace = jsonCandidate.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        const sliced = jsonCandidate.slice(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(sliced);
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  private toFiniteNumber(value: unknown, fieldPath: string): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.round(value * 10) / 10;
    }
    if (typeof value === 'string') {
      const numeric = Number(value.replace(',', '.').trim());
      if (Number.isFinite(numeric)) {
        return Math.round(numeric * 10) / 10;
      }
    }
    if (value !== undefined && value !== null) {
      throw new BadRequestException(`${fieldPath} debe ser numérico.`);
    }
    return null;
  }

  private requirePositiveNumber(value: unknown, fieldPath: string): number {
    const parsed = this.toFiniteNumber(value, fieldPath);
    if (parsed === null || parsed < 0) {
      throw new BadRequestException(`${fieldPath} debe ser un número >= 0.`);
    }
    return parsed;
  }

  private toNonEmptyString(value: unknown, fieldPath: string): string | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }
    if (value !== undefined && value !== null) {
      throw new BadRequestException(`${fieldPath} debe ser string.`);
    }
    return null;
  }

  private toOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
}
