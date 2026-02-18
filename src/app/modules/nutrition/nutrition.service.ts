import {
  ChatResponseDto,
  RecognizeFoodResponseDto,
  UserContext,
  RoutineSessionEntity,
  UserEntity,
} from '@app/entity-data-models';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HttpService } from '@nestjs/axios';
import { Injectable, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ENV } from '../../../environments/environment';
import { ChatMessage } from '../../services/ai-provider.base';
import { AIService } from '../../services/ai.service';
import { RoutineService } from '../routine/routine.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { ProfileService } from './services/profile.service';

const FREE_TIER_TOTAL_LIMIT = 10;

@Injectable()
export class NutritionService {
  private readonly logger = new Logger(NutritionService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly aiService: AIService,
    private readonly routineService: RoutineService,
    private readonly profileService: ProfileService,
    private readonly subscriptionService: SubscriptionService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async getChatUsage(userId: string) {
    const subscription = await this.subscriptionService.getSubscriptionStatus(
      userId,
    );

    if (subscription.isPremium) {
      return {
        isPremium: true,
        used: 0,
        limit: null,
        remaining: null,
      };
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'aiChatUsageCount'],
    });

    const used = user?.aiChatUsageCount ?? 0;

    return {
      isPremium: false,
      used,
      limit: FREE_TIER_TOTAL_LIMIT,
      remaining: Math.max(0, FREE_TIER_TOTAL_LIMIT - used),
    };
  }

  // CHATBOT - Multi-API with context

  async chat(
    text: string,
    history?: Array<{ role: string; content: string }>,
    userId?: string,
  ): Promise<ChatResponseDto> {
    try {
      let shouldIncrementUsage = false;

      if (userId) {
        const usage = await this.getChatUsage(userId);
        if (
          !usage.isPremium &&
          usage.remaining !== null &&
          usage.remaining <= 0
        ) {
          throw new ForbiddenException(
            `Has alcanzado el límite de ${FREE_TIER_TOTAL_LIMIT} consultas en el plan gratuito. Actualiza a Premium para consultas ilimitadas.`,
          );
        }

        shouldIncrementUsage = !usage.isPremium;
      }

      // Build conversation history
      const messages: ChatMessage[] = [];

      // Add previous messages from history
      if (history && history.length > 0) {
        history.forEach(msg => {
          messages.push({
            role:
              msg.role === 'bot'
                ? 'assistant'
                : (msg.role as ChatMessage['role']),
            content: msg.content,
          });
        });
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: text,
      });

      // Get user context if userId provided
      let userContext: UserContext | undefined = undefined;
      if (userId) {
        try {
          // Get nutrition profile
          const profile = await this.profileService.getUserProfile(userId);

          // Get training data
          const routines = await this.routineService.findAll(userId);
          const allSessions = await this.routineService.getAllSessions(userId);
          const stats = await this.routineService.getGlobalStats(userId);

          userContext = {
            userId,
            profile: {
              age: profile.anthropometrics?.age,
              gender: profile.anthropometrics?.gender,
              weight: profile.anthropometrics?.weight,
              height: profile.anthropometrics?.height,
              activityLevel: profile.anthropometrics?.activityLevel,
              goals: {
                weightGoal: profile.goals?.weightGoal,
                targetWeight: profile.goals?.targetWeight,
                dailyCalories: profile.macroGoals?.dailyCalories,
                protein: profile.macroGoals?.protein,
                carbs: profile.macroGoals?.carbs,
                fat: profile.macroGoals?.fat,
              },
            },
            training: {
              routines: routines.map(r => ({
                id: r.id,
                name: r.title,
                description: undefined, // Description does not exist on RoutineEntity
                exerciseCount: r.routineExercises?.length || 0,
              })),
              recentSessions: allSessions.slice(0, 5).map(s => ({
                date: new Date(s.createdAt).toLocaleDateString('es-ES'),
                routineName: s.routine?.title || 'Rutina desconocida',
                exercisesCompleted: s.exercises?.length || 0,
              })),
              stats: {
                totalSessions: allSessions.length || 0,
                totalExercises: stats.completedSets || 0, // Using completedSets as proxy for volume
                averageSessionsPerWeek:
                  allSessions.length > 0
                    ? parseFloat((allSessions.length / 4).toFixed(1)) // Approx last month
                    : 0,
                lastWorkoutDate:
                  allSessions.length > 0
                    ? new Date(allSessions[0].createdAt).toLocaleDateString(
                        'es-ES',
                      )
                    : undefined,
              },
              schedule: this.calculateSchedule(allSessions),
            },
          };
        } catch (error) {
          // User profile or training data not found, continue without full context
        }
      }

      // Call AI service with multi-provider fallback
      const response = await this.aiService.chat(messages, userContext);

      if (shouldIncrementUsage && userId) {
        await this.userRepository.increment({ id: userId }, 'aiChatUsageCount', 1);
      }

      return {
        reply: response.content,
        provider: response.provider,
        model: response.model,
      };
    } catch (error) {
      console.error('Error en chat:', error);
      throw new Error(
        'No se pudo procesar la solicitud. Por favor, inténtalo más tarde.',
      );
    }
  }

  // Recognition de alimentos
  async recognizeFood(
    file: Express.Multer.File,
  ): Promise<RecognizeFoodResponseDto[]> {
    if (!file) {
      throw new BadRequestException('No se recibió ninguna imagen');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('La imagen recibida está vacía');
    }

    try {
      if (!ENV.GEMINI_API_KEY) {
        throw new Error(
          'Falta GEMINI_API_KEY para analizar imágenes de alimentos',
        );
      }

      const mimeType = this.resolveMimeType(file);
      const imageBase64 = file.buffer.toString('base64');
      const items = await this.recognizeFoodWithGemini(imageBase64, mimeType);

      return items;
    } catch (error) {
      this.logger.error(
        `Error en reconocimiento de alimentos: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error(
        'No se pudo procesar la solicitud de reconocimiento de alimentos.',
      );
    }
  }

  private resolveMimeType(file: Express.Multer.File): string {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      return file.mimetype;
    }

    const lowerName = (file.originalname || '').toLowerCase();
    if (lowerName.endsWith('.png')) return 'image/png';
    if (lowerName.endsWith('.webp')) return 'image/webp';
    if (lowerName.endsWith('.heic')) return 'image/heic';
    return 'image/jpeg';
  }

  private async recognizeFoodWithGemini(
    imageBase64: string,
    mimeType: string,
  ): Promise<RecognizeFoodResponseDto[]> {
    const client = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Analiza esta imagen de comida como una app tipo CalAI.

Devuelve SOLO JSON válido (sin markdown, sin texto adicional) con este formato exacto:
{
  "items": [
    {
      "name": "string",
      "calories": number|null,
      "proteins": number|null,
      "carbs": number|null,
      "fats": number|null,
      "servingSize": number|null,
      "confidence": number
    }
  ]
}

Reglas:
- Detecta hasta 5 alimentos visibles principales.
- "name" en español.
- Macros y calorías estimadas para la porción visible en la imagen.
- "servingSize" en gramos de la porción visible.
- "confidence" entre 0 y 1.
- Si no hay comida claramente identificable, devuelve {"items":[]}.
`;

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
    ]);

    const rawText = result.response.text();
    return this.parseGeminiRecognitionResponse(rawText);
  }

  private parseGeminiRecognitionResponse(
    rawText: string,
  ): RecognizeFoodResponseDto[] {
    const parsed = this.parseJsonFromModelResponse(rawText);

    if (!parsed || typeof parsed !== 'object') {
      return [];
    }

    const record = parsed as Record<string, unknown>;
    const rawItems = Array.isArray(record.items) ? record.items : [];

    const normalized: RecognizeFoodResponseDto[] = rawItems
      .map(item => {
        if (!item || typeof item !== 'object') return null;
        const obj = item as Record<string, unknown>;
        const name = this.normalizeFoodName(obj.name);
        if (!name) return null;

        return {
          name,
          calories: this.toNullableNumber(obj.calories),
          proteins: this.toNullableNumber(obj.proteins),
          carbs: this.toNullableNumber(obj.carbs),
          fats: this.toNullableNumber(obj.fats),
          servingSize: this.toNullableNumber(obj.servingSize),
        } as RecognizeFoodResponseDto;
      })
      .filter((item): item is RecognizeFoodResponseDto => Boolean(item));

    return normalized;
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

  private toNullableNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.round(value * 10) / 10;
    }
    if (typeof value === 'string') {
      const numeric = Number(value.replace(',', '.').trim());
      if (Number.isFinite(numeric)) {
        return Math.round(numeric * 10) / 10;
      }
    }
    return null;
  }

  private normalizeFoodName(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  private calculateSchedule(sessions: RoutineSessionEntity[]): {
    frequentDays: string[];
    preferredTime: string;
  } {
    if (!sessions || sessions.length === 0) {
      return { frequentDays: [], preferredTime: 'No definido' };
    }

    const daysCount: Record<string, number> = {};
    const hours: number[] = [];

    sessions.forEach(session => {
      const date = new Date(session.createdAt);
      const day = date.toLocaleDateString('es-ES', { weekday: 'long' });
      daysCount[day] = (daysCount[day] || 0) + 1;
      hours.push(date.getHours());
    });

    // Sort days by frequency
    const frequentDays = Object.entries(daysCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);

    // Calculate average time
    const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length;
    let preferredTime = 'Mañana';
    if (avgHour >= 12 && avgHour < 20) preferredTime = 'Tarde';
    else if (avgHour >= 20) preferredTime = 'Noche';

    return {
      frequentDays,
      preferredTime: `${preferredTime} (~${Math.round(avgHour)}:00)`,
    };
  }
}
