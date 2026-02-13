import {
  ChatResponseDto,
  RecognizeFoodResponseDto,
  UserContext,
  RoutineSessionEntity,
  UserEntity,
} from '@app/entity-data-models';
import { HttpService } from '@nestjs/axios';
import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '../../services/ai-provider.base';
import { AIService } from '../../services/ai.service';
import { RoutineService } from '../routine/routine.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { ProfileService } from './services/profile.service';

const FREE_TIER_TOTAL_LIMIT = 10;

@Injectable()
export class NutritionService {
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
  async recognizeFood(formData: unknown): Promise<RecognizeFoodResponseDto> {
    try {
      //TODO: Descomentado para no gastar tokens de LogMeal API
      /* const segmentation = await lastValueFrom(
        this.httpService.post(
          'https://api.logmeal.es/v2/image/segmentation/complete',
          formData,
          {
            headers: { Authorization: `Bearer ${ENV.LOGMEAL_API_KEY}` },
          },
        ),
      ); */

      const segmentation = {
        foodFamily: [
          {
            code: 8,
            name: 'légumes',
            prob: 0.99560546875,
          },
        ],
        foodType: [
          {
            id: 2,
            name: 'ingrédients',
          },
          {
            id: 1,
            name: 'nourriture',
          },
          {
            id: 1,
            name: 'nourriture',
          },
          {
            id: 1,
            name: 'nourriture',
          },
          {
            id: 2,
            name: 'ingrédients',
          },
          {
            id: 1,
            name: 'nourriture',
          },
        ],
        imageId: 1917601,
        model_versions: {
          drinks: 'v1.0',
          foodType: 'v1.0',
          foodgroups: 'v1.0',
          foodrec: 'v1.0',
          ingredients: 'v1.0',
        },
        occasion: 'dinner',
        occasion_info: {
          id: null,
          translation: 'dinner',
        },
        recognition_results: [
          {
            hasNutriScore: true,
            id: 2124,
            name: 'tahini',
            nutri_score: {
              nutri_score_category: 'A',
              nutri_score_standardized: 73,
            },
            prob: 0.15021908283233643,
            subclasses: [
              {
                hasNutriScore: true,
                id: 2509,
                name: 'hummus de pois chiche',
                nutri_score: {
                  nutri_score_category: 'A',
                  nutri_score_standardized: 88,
                },
                prob: 0.15021908283233643,
              },
              {
                hasNutriScore: true,
                id: 2510,
                name: 'hummus lentille',
                nutri_score: {
                  nutri_score_category: 'A',
                  nutri_score_standardized: 88,
                },
                prob: 0.15021908283233643,
              },
              {
                hasNutriScore: true,
                id: 2511,
                name: 'baba ganoush',
                nutri_score: {
                  nutri_score_category: 'A',
                  nutri_score_standardized: 84,
                },
                prob: 0.15021908283233643,
              },
              {
                hasNutriScore: true,
                id: 440,
                name: 'hoummous',
                nutri_score: {
                  nutri_score_category: 'A',
                  nutri_score_standardized: 88,
                },
                prob: 0.0019330978393554688,
              },
            ],
          },
          {
            hasNutriScore: true,
            id: 2113,
            name: "ragoût d'endive",
            nutri_score: {
              nutri_score_category: 'A',
              nutri_score_standardized: 73,
            },
            prob: 0.12111306190490723,
            subclasses: [
              {
                hasNutriScore: true,
                id: 1361,
                name: 'ragoût de viande',
                nutri_score: {
                  nutri_score_category: 'A',
                  nutri_score_standardized: 84,
                },
                prob: 0.12111306190490723,
              },
              {
                hasNutriScore: true,
                id: 2152,
                name: 'ragoût de choucroute',
                nutri_score: {
                  nutri_score_category: 'C',
                  nutri_score_standardized: 59,
                },
                prob: 0.016021728515625,
              },
              {
                hasNutriScore: true,
                id: 2115,
                name: 'ragoût de chou frisé',
                nutri_score: {
                  nutri_score_category: 'A',
                  nutri_score_standardized: 95,
                },
                prob: 0.013275146484375,
              },
              {
                hasNutriScore: true,
                id: 1935,
                name: 'ragoût',
                nutri_score: {
                  nutri_score_category: 'A',
                  nutri_score_standardized: 84,
                },
                prob: 0.004413604736328125,
              },
              {
                hasNutriScore: true,
                id: 805,
                name: 'ragoût de légumes',
                nutri_score: {
                  nutri_score_category: 'A',
                  nutri_score_standardized: 90,
                },
                prob: 0.00042510032653808594,
              },
              {
                hasNutriScore: true,
                id: 134,
                name: 'ragoût de porc',
                nutri_score: {
                  nutri_score_category: 'A',
                  nutri_score_standardized: 81,
                },
                prob: 0.00015544891357421875,
              },
              {
                hasNutriScore: true,
                id: 887,
                name: 'blanquette aux champignons',
                nutri_score: {
                  nutri_score_category: 'A',
                  nutri_score_standardized: 84,
                },
                prob: 0.00006639957427978516,
              },
            ],
          },
          {
            hasNutriScore: true,
            id: 2095,
            name: 'rémoulade de céleri rave',
            nutri_score: {
              nutri_score_category: 'A',
              nutri_score_standardized: 82,
            },
            prob: 0.08552134037017822,
            subclasses: [],
          },
          {
            hasNutriScore: true,
            id: 1988,
            name: 'salade complète',
            nutri_score: {
              nutri_score_category: 'A',
              nutri_score_standardized: 84,
            },
            prob: 0.06582781672477722,
            subclasses: [],
          },
          {
            hasNutriScore: true,
            id: 1542,
            name: 'avocat',
            nutri_score: {
              nutri_score_category: 'A',
              nutri_score_standardized: 82,
            },
            prob: 0.039023905992507935,
            subclasses: [
              {
                hasNutriScore: true,
                id: 880,
                name: 'avocats sur toast',
                nutri_score: {
                  nutri_score_category: 'A',
                  nutri_score_standardized: 81,
                },
                prob: 0.0019330978393554688,
              },
              {
                hasNutriScore: true,
                id: 94,
                name: 'guacamole',
                nutri_score: {
                  nutri_score_category: 'A',
                  nutri_score_standardized: 82,
                },
                prob: 0.0006265640258789062,
              },
            ],
          },
          {
            hasNutriScore: true,
            id: 1927,
            name: 'semoule',
            nutri_score: {
              nutri_score_category: 'A',
              nutri_score_standardized: 84,
            },
            prob: 0.03565497696399689,
            subclasses: [],
          },
        ],
      };

      //TODO: Descomentado para no gastar tokens de LogMeal API

      /* const nutritionalInfo= await lastValueFrom(
        this.httpService.post(
          'https://api.logmeal.es/v2/nutrition/recipe/nutritionalInfo',
          { imageId: segmentation.imageId },
          {
            headers: { Authorization: `Bearer ${ENV.LOGMEAL_API_KEY}` },
          },
        ),
      ); */

      const nutritionalInfo = {
        foodName: "ragoût d'endive",
        hasNutritionalInfo: true,
        ids: 2113,
        imageId: 1917601,
        image_nutri_score: {
          nutri_score_category: 'A',
          nutri_score_standardized: 73,
        },
        nutritional_info: {
          calories: 318.92999999999995,
          dailyIntakeReference: {
            CHOCDF: {
              label: 'Glucides',
              level: 'LOW',
              percent: 15.971949464162732,
            },
            ENERC_KCAL: {
              label: 'Énergie',
              level: 'NONE',
              percent: 15.494908164775808,
            },
            FASAT: {
              label: 'Gras saturée',
              level: 'MEDIUM',
              percent: 28.495448573501882,
            },
            FAT: {
              label: 'Graisse',
              level: 'LOW',
              percent: 18.558440799315925,
            },
            NA: {
              label: 'Sodium',
              level: 'HIGH',
              percent: 60.55325387733333,
            },
            PROCNT: {
              label: 'Protéine',
              level: 'LOW',
              percent: 10.927716815771593,
            },
            SUGAR: {
              label: 'Sucres',
              level: 'NONE',
              percent: 8.9216,
            },
            'SUGAR.added': {
              label: 'Sucres ajoutés',
              level: 'LOW',
              percent: 0,
            },
          },
          totalNutrients: {
            ALC: {
              label: 'Alcool',
              quantity: 0,
              unit: 'g',
            },
            CA: {
              label: 'Calcium',
              quantity: 70.12389999999999,
              unit: 'mg',
            },
            CAFFN: {
              label: 'Caféine',
              quantity: 0,
              unit: 'mg',
            },
            CHOCDF: {
              label: 'Glucides',
              quantity: 36.984249999999996,
              unit: 'g',
            },
            CHOLE: {
              label: 'Cholestérol',
              quantity: 40.1775,
              unit: 'mg',
            },
            ENERC_KCAL: {
              label: 'Énergie',
              quantity: 318.92999999999995,
              unit: 'kcal',
            },
            F18D3CN3: {
              label: 'Oméga-3 ALA',
              quantity: 0.07156749999999999,
              unit: 'g',
            },
            F20D5: {
              label: 'Oméga-3 EPA',
              quantity: 0.00069,
              unit: 'g',
            },
            F22D6: {
              label: 'Oméga-3 DHA',
              quantity: 0.00138,
              unit: 'g',
            },
            FAMS: {
              label: 'Acides gras monoinsaturés',
              quantity: 4.899525,
              unit: 'g',
            },
            FAPU: {
              label: 'Graisses polyinsaturées',
              quantity: 1.5027199999999998,
              unit: 'g',
            },
            FASAT: {
              label: 'Gras saturée',
              quantity: 7.526990000000001,
              unit: 'g',
            },
            FAT: {
              label: 'Graisse',
              quantity: 14.855025000000001,
              unit: 'g',
            },
            FATRN: {
              label: 'Gras trans',
              quantity: 0.36964,
              unit: 'g',
            },
            FE: {
              label: 'Le fer',
              quantity: 2.0343630000000004,
              unit: 'mg',
            },
            FIBTG: {
              label: 'Fibre',
              quantity: 6.4,
              unit: 'g',
            },
            FOLAC: {
              label: 'Acide folique',
              quantity: 0,
              unit: 'µg',
            },
            FOLDFE: {
              label: 'Équivalent en folate (total)',
              quantity: 80.3,
              unit: 'µg',
            },
            FOLFD: {
              label: 'Folate (nourriture)',
              quantity: 80.3,
              unit: 'µg',
            },
            K: {
              label: 'Potassium',
              quantity: 1130.0863,
              unit: 'mg',
            },
            MG: {
              label: 'Magnésium',
              quantity: 59.7611,
              unit: 'mg',
            },
            NA: {
              label: 'Sodium',
              quantity: 908.29880816,
              unit: 'mg',
            },
            NIA: {
              label: 'Niacine (B3)',
              quantity: 4.1014325,
              unit: 'mg',
            },
            P: {
              label: 'Phosphore',
              quantity: 218.73,
              unit: 'mg',
            },
            PROCNT: {
              label: 'Protéine',
              quantity: 11.2462,
              unit: 'g',
            },
            RIBF: {
              label: 'Riboflavine (B2)',
              quantity: 0.17942,
              unit: 'mg',
            },
            SUGAR: {
              label: 'Sucres',
              quantity: 2.7880000000000003,
              unit: 'g',
            },
            'SUGAR.added': {
              label: 'Sucres ajoutés',
              quantity: 0,
              unit: 'g',
            },
            THIA: {
              label: 'Thiamine (B1)',
              quantity: 0.26289999999999997,
              unit: 'mg',
            },
            TOCPHA: {
              label: 'Vitamine E',
              quantity: 0.37044999999999995,
              unit: 'mg',
            },
            VITA_RAE: {
              label: 'Vitamine A',
              quantity: 83.7975,
              unit: 'µg',
            },
            VITB12: {
              label: 'Vitamine B12',
              quantity: 0.311025,
              unit: 'µg',
            },
            VITB6A: {
              label: 'Vitamine B6',
              quantity: 0.6086875,
              unit: 'mg',
            },
            VITC: {
              label: 'Vitamine C',
              quantity: 17.24,
              unit: 'mg',
            },
            VITD: {
              label: 'Vitamine D',
              quantity: 0.309,
              unit: 'µg',
            },
            VITK1: {
              label: 'Vitamine K',
              quantity: 3.74,
              unit: 'µg',
            },
            ZN: {
              label: 'Zinc',
              quantity: 1.3342100000000001,
              unit: 'mg',
            },
          },
        },
        serving_size: 298.61,
      };

      const response = {
        name: nutritionalInfo.foodName,
        calories: nutritionalInfo.nutritional_info?.calories || null,
        proteins:
          nutritionalInfo.nutritional_info?.totalNutrients.PROCNT?.quantity ||
          null,
        carbs:
          nutritionalInfo.nutritional_info?.totalNutrients.CHOCDF?.quantity ||
          null,
        fats:
          nutritionalInfo.nutritional_info?.totalNutrients.FAT?.quantity ||
          null,
        servingSize: nutritionalInfo.serving_size || null,
      };

      return response;
    } catch (error) {
      console.error(
        'Error en la solicitud de reconocimiento de alimentos:',
        error,
      );
      throw new Error(
        'No se pudo procesar la solicitud de reconocimiento de alimentos.',
      );
    }
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
