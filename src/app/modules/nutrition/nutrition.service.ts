import { GoogleGenAI } from '@google/genai';
import { HttpService } from '@nestjs/axios';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { lastValueFrom } from 'rxjs';
import { ENV } from '../../../environments/environment';
import NUTRIENT_LABELS_ES from '../../utils/nutrients-labels';
import {
  UserNutritionProfileEntity,
  FoodEntryEntity,
  CreateUserNutritionProfileDto,
  UpdateUserNutritionProfileDto,
  UpdateMacroGoalsDto,
  CreateFoodEntryDto,
  UpdateFoodEntryDto,
  UserNutritionProfileResponseDto,
  FoodEntryResponseDto,
  DailyNutritionSummaryDto,
} from '@app/entity-data-models';

@Injectable()
export class NutritionService {
  private clientOpenAI = new GoogleGenAI({
    apiKey: ENV.AIMLAPI_KEY,
  });

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(UserNutritionProfileEntity)
    private readonly userProfileRepo: Repository<UserNutritionProfileEntity>,
    @InjectRepository(FoodEntryEntity)
    private readonly foodEntryRepo: Repository<FoodEntryEntity>,
  ) {}

  // CHATBOT

  async chat(text: string): Promise<string> {
    try {
      const completion = await this.clientOpenAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: text,
      });

      const response = completion.text ?? '';

      return response;
    } catch (error) {
      console.error('Error en la solicitud a AIML API:', error);
      throw new Error(
        'No se pudo procesar la solicitud. Por favor, inténtalo más tarde.',
      );
    }
  }

  // Recognition de alimentos
  async recognizeFood(formData: any): Promise<any> {
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
          nutritionalInfo.nutritional_info?.totalNutrients.PROCNT || null,
        carbs: nutritionalInfo.nutritional_info?.totalNutrients.CHOCDF || null,
        fats: nutritionalInfo.nutritional_info?.totalNutrients.FAT || null,
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

  async getNutritionFromName(name: string): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.httpService.get(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
            name,
          )}&search_simple=1&action=process&json=1&page_size=1`,
        ),
      );
      const product = response.data.products[0];

      return {
        name: product.product_name,
        nutriments: product.nutriments,
      };
    } catch (error) {
      console.error('Error buscando nutrición por nombre:', error);
      return null;
    }
  }

  // Escaneo código
  async scanCode(code: string): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.httpService.get(
          `https://world.openfoodfacts.net/api/v2/product/${code}?fields=product_name,nutrition_grades,nutriments,image_url&lc=es`,
        ),
      );
      const product = response.data.product;

      console.log('product obtenidos:', product);
      // Mapeo de los campos principales
      const mappedProduct = {
        name: product.product_name ?? 'Producto sin nombre',
        image: product.image_url ?? null,
        nutritionGrade: product.nutrition_grades ?? null,
        calories: product.nutriments?.['energy-kcal'] ?? null,
        carbohydrates: product.nutriments?.['carbohydrates'] ?? null,
        protein: product.nutriments?.['proteins'] ?? null,
        fat: product.nutriments?.['fat'] ?? null,
        others: Object.entries(product.nutriments ?? {})
          .filter(
            ([key]) =>
              ![
                'energy-kcal',
                'energy',
                'carbohydrates',
                'proteins',
                'fat',
                'nova',
              ].some(main => key.startsWith(main)),
          )
          .map(([key, value]) => ({
            label: NUTRIENT_LABELS_ES[key] ?? key,
            value,
          })),
      };

      return mappedProduct;
    } catch (error) {
      console.error('Error en la solicitud de escaneo de código:', error);
      throw new Error('No se pudo procesar la solicitud de escaneo de código.');
    }
  }

  async getAllProducts(
    page: number = 1,
    pageSize: number = 100,
  ): Promise<{ products: any[]; total: number }> {
    try {
      // Usar el parámetro countries_tags para filtrar por España
      // También puedes usar categories populares en España
      const response = await lastValueFrom(
        this.httpService.get(
          `https://world.openfoodfacts.org/api/v2/search?` +
            `countries_tags=spain&` + // Filtra productos vendidos en España
            `language=es&` + // Idioma español
            `fields=product_name,product_name_es,brands,countries_tags,nutrition_grades,nutriments,image_url,code&` +
            `page=${page}&` +
            `page_size=${pageSize}&` +
            `sort_by=unique_scans_n&` + // Ordena por popularidad
            `json=1`,
          {
            headers: {
              'User-Agent': 'GymTrackerApp/1.0',
            },
          },
        ),
      );

      const products = response.data.products || [];

      console.log('Productos obtenidos:', page, pageSize, products.length);

      const mappedProducts = products
        .filter((product: any) => {
          // Filtros adicionales para asegurar calidad
          const hasSpanishName =
            product.product_name_es ||
            (product.product_name &&
              /^[a-zA-Z0-9\sáéíóúñÁÉÍÓÚÑ.,'-]+$/.test(product.product_name));
          const hasNutriments =
            product.nutriments &&
            (product.nutriments['energy-kcal'] !== undefined ||
              product.nutriments['energy-kcal_100g'] !== undefined);

          return hasSpanishName && hasNutriments;
        })
        .map((product: any) => ({
          code: product.code,
          name:
            product.product_name_es ??
            product.product_name ??
            'Producto sin nombre',
          brand: product.brands ?? null,
          image: product.image_url ?? null,
          nutritionGrade: product.nutrition_grades ?? null,
          grams: product.nutriments?.['serving_size']
            ? parseInt(product.nutriments.serving_size)
            : 100,
          calories:
            product.nutriments?.['energy-kcal_100g'] ??
            product.nutriments?.['energy-kcal'] ??
            null,
          carbohydrates:
            product.nutriments?.['carbohydrates_100g'] ??
            product.nutriments?.['carbohydrates'] ??
            null,
          protein:
            product.nutriments?.['proteins_100g'] ??
            product.nutriments?.['proteins'] ??
            null,
          fat:
            product.nutriments?.['fat_100g'] ??
            product.nutriments?.['fat'] ??
            null,
          others: Object.entries(product.nutriments ?? {})
            .filter(
              ([key]) =>
                ![
                  'energy-kcal',
                  'energy-kcal_100g',
                  'energy',
                  'carbohydrates',
                  'carbohydrates_100g',
                  'proteins',
                  'proteins_100g',
                  'fat',
                  'fat_100g',
                  'nova',
                ].some(main => key.startsWith(main)),
            )
            .map(([key, value]) => ({
              label: NUTRIENT_LABELS_ES[key] ?? key,
              value,
            })),
        }));

      return {
        products: mappedProducts,
        total: response.data.count || mappedProducts.length,
      };
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      return {
        products: [],
        total: 0,
      };
    }
  }

  // nutrition.service.ts

  async getProductDetail(code: string): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.httpService.get(
          `https://world.openfoodfacts.org/api/v2/product/${code}?fields=product_name,product_name_es,brands,countries_tags,nutrition_grades,nutriments,image_url,code&lc=es`,
        ),
      );

      const product = response.data.product;

      if (!product) {
        throw new NotFoundException(
          `Producto con código ${code} no encontrado`,
        );
      }

      console.log('Product detail obtenido:', product.code);

      // Mapear el producto con la misma estructura que getAllProducts
      const mappedProduct = {
        code: product.code,
        name:
          product.product_name_es ??
          product.product_name ??
          'Producto sin nombre',
        brand: product.brands ?? null,
        image: product.image_url ?? null,
        nutritionGrade: product.nutrition_grades ?? null,
        grams: 100, // Base de cálculo por defecto
        calories:
          product.nutriments?.['energy-kcal_100g'] ??
          product.nutriments?.['energy-kcal'] ??
          null,
        carbohydrates:
          product.nutriments?.['carbohydrates_100g'] ??
          product.nutriments?.['carbohydrates'] ??
          null,
        protein:
          product.nutriments?.['proteins_100g'] ??
          product.nutriments?.['proteins'] ??
          null,
        fat:
          product.nutriments?.['fat_100g'] ??
          product.nutriments?.['fat'] ??
          null,
        others: Object.entries(product.nutriments ?? {})
          .filter(
            ([key]) =>
              ![
                'energy-kcal',
                'energy-kcal_100g',
                'energy',
                'carbohydrates',
                'carbohydrates_100g',
                'proteins',
                'proteins_100g',
                'fat',
                'fat_100g',
                'nova',
              ].some(main => key.startsWith(main)),
          )
          .map(([key, value]) => ({
            label: NUTRIENT_LABELS_ES[key] ?? key,
            value,
          })),
      };

      return mappedProduct;
    } catch (error) {
      console.error('Error obteniendo detalle del producto:', error);
      throw new NotFoundException(
        `No se pudo obtener el detalle del producto con código ${code}`,
      );
    }
  }

  /* async getProductDetail(code: string): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.httpService.get(
          `https://world.openfoodfacts.org/api/v2/product/${code}?fields=product_name,nutrition_grades,nutriments,image_url&lc=es`,
        ),
      );
      const product = response.data.product;

      const mappedProduct = {
        name: product.product_name ?? 'Producto sin nombre',
        image: product.image_url ?? null,
        nutritionGrade: product.nutrition_grades ?? null,
        calories: product.nutriments?.['energy-kcal'] ?? null,
        carbohydrates: product.nutriments?.['carbohydrates'] ?? null,
        protein: product.nutriments?.['proteins'] ?? null,
        fat: product.nutriments?.['fat'] ?? null,
        others: Object.entries(product.nutriments ?? {})
          .filter(
            ([key]) =>
              ![
                'energy-kcal',
                'energy',
                'carbohydrates',
                'proteins',
                'fat',
                'nova',
              ].some((main) => key.startsWith(main)),
          )
          .map(([key, value]) => ({
            label: NUTRIENT_LABELS_ES[key] ?? key,
            value,
          })),
      };

      return mappedProduct;
    } catch (error) {
      console.error('Error obteniendo detalle del producto:', error);
      throw new Error('No se pudo obtener el detalle del producto.');
    }
  } */

  // ==================== USER PROFILE METHODS ====================

  async getUserProfile(
    userId: string,
  ): Promise<UserNutritionProfileResponseDto> {
    const profile = await this.userProfileRepo.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        `Perfil de usuario no encontrado para userId: ${userId}`,
      );
    }

    return this.mapProfileToDto(profile);
  }

  async createUserProfile(
    dto: CreateUserNutritionProfileDto,
  ): Promise<UserNutritionProfileResponseDto> {
    // Check if profile already exists
    const existing = await this.userProfileRepo.findOne({
      where: { userId: dto.userId },
    });

    if (existing) {
      throw new Error('El perfil de usuario ya existe');
    }

    const profile = this.userProfileRepo.create({
      userId: dto.userId,
      weight: dto.anthropometrics.weight,
      height: dto.anthropometrics.height,
      age: dto.anthropometrics.age,
      gender: dto.anthropometrics.gender,
      activityLevel: dto.anthropometrics.activityLevel,
      weightGoal: dto.goals.weightGoal,
      targetWeight: dto.goals.targetWeight,
      weeklyWeightChange: dto.goals.weeklyWeightChange,
      dailyCalories: dto.macroGoals.dailyCalories,
      proteinGrams: dto.macroGoals.protein,
      carbsGrams: dto.macroGoals.carbs,
      fatGrams: dto.macroGoals.fat,
      weightUnit: dto.preferences.weightUnit,
      heightUnit: dto.preferences.heightUnit,
    });

    const saved = await this.userProfileRepo.save(profile);
    return this.mapProfileToDto(saved);
  }

  async updateUserProfile(
    userId: string,
    dto: UpdateUserNutritionProfileDto,
  ): Promise<UserNutritionProfileResponseDto> {
    const profile = await this.userProfileRepo.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        `Perfil no encontrado para userId: ${userId}`,
      );
    }

    // Update anthropometrics if provided
    if (dto.anthropometrics) {
      if (dto.anthropometrics.weight !== undefined)
        profile.weight = dto.anthropometrics.weight;
      if (dto.anthropometrics.height !== undefined)
        profile.height = dto.anthropometrics.height;
      if (dto.anthropometrics.age !== undefined)
        profile.age = dto.anthropometrics.age;
      if (dto.anthropometrics.gender !== undefined)
        profile.gender = dto.anthropometrics.gender;
      if (dto.anthropometrics.activityLevel !== undefined)
        profile.activityLevel = dto.anthropometrics.activityLevel;
    }

    // Update goals if provided
    if (dto.goals) {
      if (dto.goals.weightGoal !== undefined)
        profile.weightGoal = dto.goals.weightGoal;
      if (dto.goals.targetWeight !== undefined)
        profile.targetWeight = dto.goals.targetWeight;
      if (dto.goals.weeklyWeightChange !== undefined)
        profile.weeklyWeightChange = dto.goals.weeklyWeightChange;
    }

    // Update macro goals if provided
    if (dto.macroGoals) {
      if (dto.macroGoals.dailyCalories !== undefined)
        profile.dailyCalories = dto.macroGoals.dailyCalories;
      if (dto.macroGoals.protein !== undefined)
        profile.proteinGrams = dto.macroGoals.protein;
      if (dto.macroGoals.carbs !== undefined)
        profile.carbsGrams = dto.macroGoals.carbs;
      if (dto.macroGoals.fat !== undefined)
        profile.fatGrams = dto.macroGoals.fat;
    }

    // Update preferences if provided
    if (dto.preferences) {
      if (dto.preferences.weightUnit !== undefined)
        profile.weightUnit = dto.preferences.weightUnit;
      if (dto.preferences.heightUnit !== undefined)
        profile.heightUnit = dto.preferences.heightUnit;
    }

    const updated = await this.userProfileRepo.save(profile);
    return this.mapProfileToDto(updated);
  }

  async updateMacroGoals(
    userId: string,
    dto: UpdateMacroGoalsDto,
  ): Promise<UserNutritionProfileResponseDto> {
    const profile = await this.userProfileRepo.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        `Perfil no encontrado para userId: ${userId}`,
      );
    }

    profile.dailyCalories = dto.dailyCalories;
    profile.proteinGrams = dto.protein;
    profile.carbsGrams = dto.carbs;
    profile.fatGrams = dto.fat;

    const updated = await this.userProfileRepo.save(profile);
    return this.mapProfileToDto(updated);
  }

  // ==================== FOOD DIARY METHODS ====================

  async addFoodEntry(dto: CreateFoodEntryDto): Promise<FoodEntryResponseDto> {
    const entry = this.foodEntryRepo.create(dto);
    const saved = await this.foodEntryRepo.save(entry);
    return this.mapFoodEntryToDto(saved);
  }

  async getDailyEntries(
    userId: string,
    date: string,
  ): Promise<DailyNutritionSummaryDto> {
    const entries = await this.foodEntryRepo.find({
      where: { userId, date },
      order: { createdAt: 'ASC' },
    });

    // Get user profile for goals
    const profile = await this.userProfileRepo.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        `Perfil no encontrado para userId: ${userId}`,
      );
    }

    // Calculate totals
    const totals = entries.reduce(
      (acc, entry) => ({
        calories: acc.calories + Number(entry.calories),
        protein: acc.protein + Number(entry.protein),
        carbs: acc.carbs + Number(entry.carbs),
        fat: acc.fat + Number(entry.fat),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    return {
      date,
      entries: entries.map(e => this.mapFoodEntryToDto(e)),
      totals,
      goals: {
        dailyCalories: profile.dailyCalories,
        protein: Number(profile.proteinGrams),
        carbs: Number(profile.carbsGrams),
        fat: Number(profile.fatGrams),
      },
    };
  }

  async updateFoodEntry(
    entryId: string,
    dto: UpdateFoodEntryDto,
  ): Promise<FoodEntryResponseDto> {
    const entry = await this.foodEntryRepo.findOne({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundException(`Entrada no encontrada: ${entryId}`);
    }

    // Update fields
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

    const updated = await this.foodEntryRepo.save(entry);
    return this.mapFoodEntryToDto(updated);
  }

  async deleteFoodEntry(entryId: string): Promise<void> {
    const result = await this.foodEntryRepo.delete(entryId);

    if (result.affected === 0) {
      throw new NotFoundException(`Entrada no encontrada: ${entryId}`);
    }
  }

  async getWeeklySummary(
    userId: string,
    startDate: string,
  ): Promise<DailyNutritionSummaryDto[]> {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const summaries: DailyNutritionSummaryDto[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const summary = await this.getDailyEntries(userId, dateStr);
      summaries.push(summary);
    }

    return summaries;
  }

  async getMonthlySummary(
    userId: string,
    year: number,
    month: number,
  ): Promise<DailyNutritionSummaryDto[]> {
    const daysInMonth = new Date(year, month, 0).getDate();
    const summaries: DailyNutritionSummaryDto[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = date.toISOString().split('T')[0];

      const summary = await this.getDailyEntries(userId, dateStr);
      summaries.push(summary);
    }

    return summaries;
  }

  // ==================== HELPER METHODS ====================

  private mapProfileToDto(
    profile: UserNutritionProfileEntity,
  ): UserNutritionProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      anthropometrics: {
        weight: Number(profile.weight),
        height: Number(profile.height),
        age: profile.age,
        gender: profile.gender,
        activityLevel: profile.activityLevel,
      },
      goals: {
        weightGoal: profile.weightGoal,
        targetWeight: Number(profile.targetWeight),
        weeklyWeightChange: Number(profile.weeklyWeightChange),
      },
      macroGoals: {
        dailyCalories: profile.dailyCalories,
        protein: Number(profile.proteinGrams),
        carbs: Number(profile.carbsGrams),
        fat: Number(profile.fatGrams),
      },
      preferences: {
        weightUnit: profile.weightUnit,
        heightUnit: profile.heightUnit,
      },
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
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
      createdAt: entry.createdAt,
    };
  }
}
