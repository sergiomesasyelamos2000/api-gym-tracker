import {
  CreateFoodEntryDto,
  CreateUserNutritionProfileDto,
  CustomMealEntity,
  CustomProductEntity,
  DailyNutritionSummaryDto,
  FavoriteProductEntity,
  FoodEntryEntity,
  FoodEntryResponseDto,
  ShoppingListItemEntity,
  UpdateFoodEntryDto,
  UpdateMacroGoalsDto,
  UpdateUserNutritionProfileDto,
  UserNutritionProfileEntity,
  UserNutritionProfileResponseDto,
  WeightUnit,
} from '@app/entity-data-models';
import {
  CreateCustomMealDto,
  CustomMealResponseDto,
  MealProductDto,
  UpdateCustomMealDto,
} from '@app/entity-data-models/dtos/custom-meal.dto';
import {
  CreateCustomProductDto,
  CustomProductResponseDto,
  UpdateCustomProductDto,
} from '@app/entity-data-models/dtos/custom-product.dto';
import {
  CreateFavoriteProductDto,
  FavoriteProductResponseDto,
} from '@app/entity-data-models/dtos/favorite-product.dto';
import {
  CreateShoppingListItemDto,
  ShoppingListItemResponseDto,
  UpdateShoppingListItemDto,
} from '@app/entity-data-models/dtos/shopping-list.dto';
import { GoogleGenAI } from '@google/genai';
import { HttpService } from '@nestjs/axios';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import cloudinary from '../../../config/cloudinary.config';
import { ENV } from '../../../environments/environment';
import NUTRIENT_LABELS_ES from '../../utils/nutrients-labels';

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
    @InjectRepository(ShoppingListItemEntity)
    private readonly shoppingListRepo: Repository<ShoppingListItemEntity>,
    @InjectRepository(FavoriteProductEntity)
    private readonly favoriteProductRepo: Repository<FavoriteProductEntity>,
    @InjectRepository(CustomProductEntity)
    private readonly customProductRepo: Repository<CustomProductEntity>,
    @InjectRepository(CustomMealEntity)
    private readonly customMealRepo: Repository<CustomMealEntity>,
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

    // Create profile with initial data
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

    // If macros are not provided or are default values, calculate them automatically
    const hasDefaultMacros =
      dto.macroGoals.dailyCalories === 2000 &&
      dto.macroGoals.protein === 150 &&
      dto.macroGoals.carbs === 200 &&
      dto.macroGoals.fat === 65;

    if (hasDefaultMacros) {
      const calculatedMacros = this.recalculateAllMacros(profile);
      profile.dailyCalories = calculatedMacros.dailyCalories;
      profile.proteinGrams = calculatedMacros.protein;
      profile.carbsGrams = calculatedMacros.carbs;
      profile.fatGrams = calculatedMacros.fat;
    }

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

    // Track if anthropometric or goal data changed (affects macro calculation)
    let shouldRecalculateMacros = false;

    // Update anthropometrics if provided
    if (dto.anthropometrics) {
      if (dto.anthropometrics.weight !== undefined) {
        profile.weight = dto.anthropometrics.weight;
        shouldRecalculateMacros = true;
      }
      if (dto.anthropometrics.height !== undefined) {
        profile.height = dto.anthropometrics.height;
        shouldRecalculateMacros = true;
      }
      if (dto.anthropometrics.age !== undefined) {
        profile.age = dto.anthropometrics.age;
        shouldRecalculateMacros = true;
      }
      if (dto.anthropometrics.gender !== undefined) {
        profile.gender = dto.anthropometrics.gender;
        shouldRecalculateMacros = true;
      }
      if (dto.anthropometrics.activityLevel !== undefined) {
        profile.activityLevel = dto.anthropometrics.activityLevel;
        shouldRecalculateMacros = true;
      }
    }

    // Update goals if provided
    if (dto.goals) {
      if (dto.goals.weightGoal !== undefined) {
        profile.weightGoal = dto.goals.weightGoal;
        shouldRecalculateMacros = true;
      }
      if (dto.goals.targetWeight !== undefined) {
        profile.targetWeight = dto.goals.targetWeight;
      }
      if (dto.goals.weeklyWeightChange !== undefined) {
        profile.weeklyWeightChange = dto.goals.weeklyWeightChange;
        shouldRecalculateMacros = true;
      }
    }

    // Update macro goals if provided (manual override, don't recalculate)
    if (dto.macroGoals) {
      if (dto.macroGoals.dailyCalories !== undefined)
        profile.dailyCalories = dto.macroGoals.dailyCalories;
      if (dto.macroGoals.protein !== undefined)
        profile.proteinGrams = dto.macroGoals.protein;
      if (dto.macroGoals.carbs !== undefined)
        profile.carbsGrams = dto.macroGoals.carbs;
      if (dto.macroGoals.fat !== undefined)
        profile.fatGrams = dto.macroGoals.fat;
      shouldRecalculateMacros = false; // Manual macro override takes precedence
    }

    // Update preferences if provided
    if (dto.preferences) {
      if (dto.preferences.weightUnit !== undefined)
        profile.weightUnit = dto.preferences.weightUnit;
      if (dto.preferences.heightUnit !== undefined)
        profile.heightUnit = dto.preferences.heightUnit;
    }

    // Recalculate macros if anthropometric data or goals changed and no manual override
    if (shouldRecalculateMacros) {
      const calculatedMacros = this.recalculateAllMacros(profile);
      profile.dailyCalories = calculatedMacros.dailyCalories;
      profile.proteinGrams = calculatedMacros.protein;
      profile.carbsGrams = calculatedMacros.carbs;
      profile.fatGrams = calculatedMacros.fat;
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
    // ✅ Buscar entradas por userId directamente
    const entries = await this.foodEntryRepo.find({
      where: {
        userId: userId,
        date: date,
      },
      order: { createdAt: 'ASC' },
    });

    // ✅ Buscar o crear perfil de nutrición
    let profile = await this.userProfileRepo.findOne({
      where: { userId },
    });

    // ✅ Si no existe perfil, devolver valores por defecto sin guardar
    if (!profile) {
      return {
        date,
        entries: entries.map(e => this.mapFoodEntryToDto(e)),
        totals: this.calculateTotals(entries),
        goals: {
          dailyCalories: 2000,
          protein: 150,
          carbs: 200,
          fat: 65,
        },
        hasProfile: false, // ← Nuevo flag
      };
    }

    return {
      date,
      entries: entries.map(e => this.mapFoodEntryToDto(e)),
      totals: this.calculateTotals(entries),
      goals: {
        dailyCalories: profile.dailyCalories,
        protein: Number(profile.proteinGrams),
        carbs: Number(profile.carbsGrams),
        fat: Number(profile.fatGrams),
      },
      hasProfile: true,
    };
  }

  private calculateTotals(entries: FoodEntryEntity[]) {
    return entries.reduce(
      (acc, entry) => ({
        calories: acc.calories + Number(entry.calories),
        protein: acc.protein + Number(entry.protein),
        carbs: acc.carbs + Number(entry.carbs),
        fat: acc.fat + Number(entry.fat),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
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

    // Validate ownership
    if (entry.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para modificar esta entrada',
      );
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

  async deleteFoodEntry(entryId: string, userId: string): Promise<void> {
    const entry = await this.foodEntryRepo.findOne({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundException(`Entrada no encontrada: ${entryId}`);
    }

    // Validate ownership
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

  /**
   * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
   * @param weight - Weight in kg
   * @param height - Height in cm
   * @param age - Age in years
   * @param gender - Gender (male/female/other)
   * @returns BMR in calories
   */
  private calculateBMR(
    weight: number,
    height: number,
    age: number,
    gender: string,
  ): number {
    // Mifflin-St Jeor Equation
    // Men: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
    // Women: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
    // Other: Average of both
    const baseBMR = 10 * weight + 6.25 * height - 5 * age;

    switch (gender.toLowerCase()) {
      case 'male':
        return baseBMR + 5;
      case 'female':
        return baseBMR - 161;
      default:
        return baseBMR - 78; // Average of male and female
    }
  }

  /**
   * Calculate TDEE (Total Daily Energy Expenditure)
   * @param bmr - Basal Metabolic Rate
   * @param activityLevel - Activity level
   * @returns TDEE in calories
   */
  private calculateTDEE(bmr: number, activityLevel: string): number {
    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extra_active: 1.9,
    };

    const multiplier = activityMultipliers[activityLevel] || 1.55;
    return bmr * multiplier;
  }

  /**
   * Calculate daily calorie goal based on weight goal
   * @param tdee - Total Daily Energy Expenditure
   * @param weightGoal - Weight goal (lose/gain/maintain)
   * @param weeklyWeightChange - Weekly weight change in kg
   * @returns Adjusted daily calories
   */
  private calculateDailyCalories(
    tdee: number,
    weightGoal: string,
    weeklyWeightChange: number,
  ): number {
    // 1 kg of fat = approximately 7700 calories
    // Weekly deficit/surplus needed
    const weeklyCalorieChange = weeklyWeightChange * 7700;
    const dailyCalorieChange = weeklyCalorieChange / 7;

    switch (weightGoal.toLowerCase()) {
      case 'lose':
        return Math.round(tdee - Math.abs(dailyCalorieChange));
      case 'gain':
        return Math.round(tdee + Math.abs(dailyCalorieChange));
      default: // maintain
        return Math.round(tdee);
    }
  }

  /**
   * Calculate macro distribution
   * @param dailyCalories - Daily calorie goal
   * @param weight - Weight in kg
   * @param weightGoal - Weight goal (lose/gain/maintain)
   * @returns Object with protein, carbs, and fat in grams
   */
  private calculateMacros(
    dailyCalories: number,
    weight: number,
    weightGoal: string,
  ): {
    protein: number;
    carbs: number;
    fat: number;
  } {
    // Protein: 1.8-2.2g per kg for muscle gain/maintenance, 2.0-2.4g per kg for fat loss
    let proteinGramsPerKg = 2.0;
    if (weightGoal === 'lose') {
      proteinGramsPerKg = 2.2;
    } else if (weightGoal === 'gain') {
      proteinGramsPerKg = 2.0;
    }

    const protein = Math.round(weight * proteinGramsPerKg);
    const proteinCalories = protein * 4; // 4 calories per gram of protein

    // Fat: 25-30% of total calories
    const fatCalories = dailyCalories * 0.275; // 27.5% average
    const fat = Math.round(fatCalories / 9); // 9 calories per gram of fat

    // Carbs: Remaining calories
    const carbCalories = dailyCalories - proteinCalories - fatCalories;
    const carbs = Math.round(carbCalories / 4); // 4 calories per gram of carbs

    return {
      protein,
      carbs: Math.max(0, carbs), // Ensure non-negative
      fat,
    };
  }

  /**
   * Recalculate all macros based on anthropometric data
   * @param profile - User nutrition profile
   * @returns Updated macro values
   */
  private recalculateAllMacros(profile: UserNutritionProfileEntity): {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  } {
    // Calculate BMR
    const bmr = this.calculateBMR(
      Number(profile.weight),
      Number(profile.height),
      profile.age,
      profile.gender,
    );

    // Calculate TDEE
    const tdee = this.calculateTDEE(bmr, profile.activityLevel);

    // Calculate daily calories based on goal
    const dailyCalories = this.calculateDailyCalories(
      tdee,
      profile.weightGoal,
      Number(profile.weeklyWeightChange),
    );

    // Calculate macros
    const macros = this.calculateMacros(
      dailyCalories,
      Number(profile.weight),
      profile.weightGoal,
    );

    return {
      dailyCalories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    };
  }

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
        weightUnit: profile.weightUnit as WeightUnit,
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

  // ==================== SHOPPING LIST METHODS ====================

  /**
   * Add a product to the shopping list
   * @param dto - Shopping list item creation data
   * @returns Created shopping list item
   */
  async addToShoppingList(
    dto: CreateShoppingListItemDto,
  ): Promise<ShoppingListItemResponseDto> {
    // Check if item already exists for this user and product
    const existing = await this.shoppingListRepo.findOne({
      where: {
        userId: dto.userId,
        productCode: dto.productCode,
      },
    });

    if (existing) {
      // Update quantity if item already exists
      existing.quantity = Number(existing.quantity) + Number(dto.quantity);
      const updated = await this.shoppingListRepo.save(existing);
      return this.mapShoppingListItemToDto(updated);
    }

    const item = this.shoppingListRepo.create(dto);
    const saved = await this.shoppingListRepo.save(item);
    return this.mapShoppingListItemToDto(saved);
  }

  /**
   * Get all shopping list items for a user
   * @param userId - User identifier
   * @returns Array of shopping list items
   */
  async getShoppingList(
    userId: string,
  ): Promise<ShoppingListItemResponseDto[]> {
    const items = await this.shoppingListRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return items.map(item => this.mapShoppingListItemToDto(item));
  }

  /**
   * Get shopping list items by purchase status
   * @param userId - User identifier
   * @param purchased - Filter by purchased status
   * @returns Array of shopping list items
   */
  async getShoppingListByStatus(
    userId: string,
    purchased: boolean,
  ): Promise<ShoppingListItemResponseDto[]> {
    const items = await this.shoppingListRepo.find({
      where: { userId, purchased },
      order: { createdAt: 'DESC' },
    });

    return items.map(item => this.mapShoppingListItemToDto(item));
  }

  /**
   * Update a shopping list item
   * @param itemId - Shopping list item identifier
   * @param dto - Update data
   * @returns Updated shopping list item
   * @throws NotFoundException if item not found
   */
  async updateShoppingListItem(
    itemId: string,
    dto: UpdateShoppingListItemDto,
    userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    const item = await this.shoppingListRepo.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(
        `Item de lista de compras no encontrado: ${itemId}`,
      );
    }

    // Validate ownership
    if (item.userId !== userId) {
      throw new NotFoundException('No tienes permiso para modificar este item');
    }

    // Update fields if provided
    if (dto.quantity !== undefined) item.quantity = dto.quantity;
    if (dto.unit !== undefined) item.unit = dto.unit;
    if (dto.customUnitName !== undefined)
      item.customUnitName = dto.customUnitName;
    if (dto.customUnitGrams !== undefined)
      item.customUnitGrams = dto.customUnitGrams;
    if (dto.purchased !== undefined) item.purchased = dto.purchased;

    const updated = await this.shoppingListRepo.save(item);
    return this.mapShoppingListItemToDto(updated);
  }

  /**
   * Toggle shopping list item purchased status
   * @param itemId - Shopping list item identifier
   * @param userId - User identifier for validation
   * @returns Updated shopping list item
   * @throws NotFoundException if item not found
   */
  async togglePurchased(
    itemId: string,
    userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    const item = await this.shoppingListRepo.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(
        `Item de lista de compras no encontrado: ${itemId}`,
      );
    }

    // Validate ownership
    if (item.userId !== userId) {
      throw new NotFoundException('No tienes permiso para modificar este item');
    }

    // Toggle the purchased status
    item.purchased = !item.purchased;

    const updated = await this.shoppingListRepo.save(item);
    return this.mapShoppingListItemToDto(updated);
  }

  /**
   * Delete a shopping list item
   * @param itemId - Shopping list item identifier
   * @param userId - User identifier for validation
   * @throws NotFoundException if item not found
   */
  async deleteShoppingListItem(itemId: string, userId: string): Promise<void> {
    const item = await this.shoppingListRepo.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(
        `Item de lista de compras no encontrado: ${itemId}`,
      );
    }

    // Validate ownership
    if (item.userId !== userId) {
      throw new NotFoundException('No tienes permiso para eliminar este item');
    }

    await this.shoppingListRepo.delete(itemId);
  }

  /**
   * Delete all purchased items from shopping list
   * @param userId - User identifier
   * @returns Number of deleted items
   */
  async clearPurchasedItems(userId: string): Promise<number> {
    const result = await this.shoppingListRepo.delete({
      userId,
      purchased: true,
    });

    return result.affected || 0;
  }

  /**
   * Delete all shopping list items for a user
   * @param userId - User identifier
   * @returns Number of deleted items
   */
  async clearShoppingList(userId: string): Promise<number> {
    const result = await this.shoppingListRepo.delete({ userId });
    return result.affected || 0;
  }

  // ==================== FAVORITE PRODUCTS METHODS ====================

  /**
   * Add a product to favorites
   * @param dto - Favorite product creation data
   * @returns Created favorite product
   */
  async addFavorite(
    dto: CreateFavoriteProductDto,
  ): Promise<FavoriteProductResponseDto> {
    // Check if product is already favorited
    const existing = await this.favoriteProductRepo.findOne({
      where: {
        userId: dto.userId,
        productCode: dto.productCode,
      },
    });

    if (existing) {
      // Return existing favorite instead of creating duplicate
      return this.mapFavoriteProductToDto(existing);
    }

    const favorite = this.favoriteProductRepo.create(dto);
    const saved = await this.favoriteProductRepo.save(favorite);
    return this.mapFavoriteProductToDto(saved);
  }

  /**
   * Get all favorite products for a user
   * @param userId - User identifier
   * @returns Array of favorite products
   */
  async getFavorites(userId: string): Promise<FavoriteProductResponseDto[]> {
    const favorites = await this.favoriteProductRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return favorites.map(fav => this.mapFavoriteProductToDto(fav));
  }

  /**
   * Get a single favorite product by ID
   * @param favoriteId - Favorite product identifier
   * @returns Favorite product
   * @throws NotFoundException if favorite not found
   */
  async getFavoriteById(
    favoriteId: string,
  ): Promise<FavoriteProductResponseDto> {
    const favorite = await this.favoriteProductRepo.findOne({
      where: { id: favoriteId },
    });

    if (!favorite) {
      throw new NotFoundException(
        `Producto favorito no encontrado: ${favoriteId}`,
      );
    }

    return this.mapFavoriteProductToDto(favorite);
  }

  /**
   * Check if a product is favorited by user
   * @param userId - User identifier
   * @param productCode - Product code
   * @returns True if product is favorited, false otherwise
   */
  async isFavorite(userId: string, productCode: string): Promise<boolean> {
    const favorite = await this.favoriteProductRepo.findOne({
      where: { userId, productCode },
    });

    return !!favorite;
  }

  /**
   * Remove a product from favorites by favorite ID
   * @param favoriteId - Favorite product identifier
   * @throws NotFoundException if favorite not found
   */
  async removeFavorite(favoriteId: string): Promise<void> {
    const result = await this.favoriteProductRepo.delete(favoriteId);

    if (result.affected === 0) {
      throw new NotFoundException(
        `Producto favorito no encontrado: ${favoriteId}`,
      );
    }
  }

  /**
   * Remove a product from favorites by user ID and product code
   * @param userId - User identifier
   * @param productCode - Product code
   * @throws NotFoundException if favorite not found
   */
  async removeFavoriteByProductCode(
    userId: string,
    productCode: string,
  ): Promise<void> {
    const result = await this.favoriteProductRepo.delete({
      userId,
      productCode,
    });

    if (result.affected === 0) {
      throw new NotFoundException(
        `Producto favorito no encontrado para el código: ${productCode}`,
      );
    }
  }

  /**
   * Search favorites by product name
   * @param userId - User identifier
   * @param searchTerm - Search term for product name
   * @returns Array of matching favorite products
   */
  async searchFavorites(
    userId: string,
    searchTerm: string,
  ): Promise<FavoriteProductResponseDto[]> {
    const favorites = await this.favoriteProductRepo
      .createQueryBuilder('favorite')
      .where('favorite.userId = :userId', { userId })
      .andWhere('LOWER(favorite.productName) LIKE LOWER(:searchTerm)', {
        searchTerm: `%${searchTerm}%`,
      })
      .orderBy('favorite.createdAt', 'DESC')
      .getMany();

    return favorites.map(fav => this.mapFavoriteProductToDto(fav));
  }

  // ==================== CUSTOM PRODUCTS METHODS ====================

  /**
   * Create a custom product
   * @param dto - Custom product creation data
   * @returns Created custom product
   */
  async createCustomProduct(
    dto: CreateCustomProductDto,
  ): Promise<CustomProductResponseDto> {
    try {
      // Si hay imagen en base64, subirla a Cloudinary
      let imageUrl: string | undefined = undefined;
      if (dto.image && dto.image.startsWith('data:image')) {
        imageUrl = await this.uploadToCloudinary(dto.image, 'products');
      } else if (dto.image) {
        imageUrl = dto.image; // URL ya existente
      }

      const product = this.customProductRepo.create({
        ...dto,
        image: imageUrl,
      });

      const saved = await this.customProductRepo.save(product);
      return this.mapCustomProductToDto(saved);
    } catch (error) {
      console.error('Error creating custom product:', error);
      throw error;
    }
  }

  /**
   * Get all custom products for a user
   * @param userId - User identifier
   * @returns Array of custom products
   */
  async getCustomProducts(userId: string): Promise<CustomProductResponseDto[]> {
    const products = await this.customProductRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return products.map(product => this.mapCustomProductToDto(product));
  }

  /**
   * Get a single custom product by ID
   * @param productId - Custom product identifier
   * @returns Custom product
   * @throws NotFoundException if product not found
   */
  async getCustomProductById(
    userId: string,
    productId: string,
  ): Promise<CustomProductResponseDto> {
    const product = await this.customProductRepo.findOne({
      where: { id: productId, userId },
    });

    if (!product) {
      throw new NotFoundException(
        `Producto personalizado no encontrado: ${productId}`,
      );
    }

    return this.mapCustomProductToDto(product);
  }

  /**
   * Get custom products by user and optional barcode
   * @param userId - User identifier
   * @param barcode - Optional barcode filter
   * @returns Array of custom products or single product if barcode matches
   */
  async getCustomProductByBarcode(
    userId: string,
    barcode: string,
  ): Promise<CustomProductResponseDto | null> {
    const product = await this.customProductRepo.findOne({
      where: { userId, barcode },
    });

    return product ? this.mapCustomProductToDto(product) : null;
  }

  /**
   * Update a custom product
   * @param productId - Custom product identifier
   * @param dto - Update data
   * @param userId - User identifier for validation
   * @returns Updated custom product
   * @throws NotFoundException if product not found
   */
  async updateCustomProduct(
    productId: string,
    dto: UpdateCustomProductDto,
    userId: string,
  ): Promise<CustomProductResponseDto> {
    const product = await this.customProductRepo.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(
        `Producto personalizado no encontrado: ${productId}`,
      );
    }

    // Validate ownership
    if (product.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para modificar este producto',
      );
    }

    // Si hay nueva imagen en base64, subirla
    let imageUrl = product.image;
    if (dto.image && dto.image.startsWith('data:image')) {
      // Eliminar imagen anterior de Cloudinary si existe
      if (product.image && product.image.includes('cloudinary.com')) {
        const publicId = this.extractPublicIdFromUrl(product.image);
        await this.deleteFromCloudinary(publicId);
      }
      imageUrl = await this.uploadToCloudinary(dto.image, 'products');
    } else if (dto.image !== undefined) {
      imageUrl = dto.image;
    }

    // Update fields if provided
    if (dto.name !== undefined) product.name = dto.name;
    if (dto.description !== undefined) product.description = dto.description;
    product.image = imageUrl;
    if (dto.brand !== undefined) product.brand = dto.brand;
    if (dto.caloriesPer100 !== undefined)
      product.caloriesPer100 = dto.caloriesPer100;
    if (dto.proteinPer100 !== undefined)
      product.proteinPer100 = dto.proteinPer100;
    if (dto.carbsPer100 !== undefined) product.carbsPer100 = dto.carbsPer100;
    if (dto.fatPer100 !== undefined) product.fatPer100 = dto.fatPer100;
    if (dto.fiberPer100 !== undefined) product.fiberPer100 = dto.fiberPer100;
    if (dto.sugarPer100 !== undefined) product.sugarPer100 = dto.sugarPer100;
    if (dto.sodiumPer100 !== undefined) product.sodiumPer100 = dto.sodiumPer100;
    if (dto.servingSize !== undefined) product.servingSize = dto.servingSize;
    if (dto.servingUnit !== undefined) product.servingUnit = dto.servingUnit;
    if (dto.barcode !== undefined) product.barcode = dto.barcode;

    const updated = await this.customProductRepo.save(product);
    return this.mapCustomProductToDto(updated);
  }

  /**
   * Search custom products by name
   * @param userId - User identifier
   * @param searchTerm - Search term for product name
   * @returns Array of matching custom products
   */
  async searchCustomProducts(
    userId: string,
    searchTerm: string,
  ): Promise<CustomProductResponseDto[]> {
    const products = await this.customProductRepo
      .createQueryBuilder('product')
      .where('product.userId = :userId', { userId })
      .andWhere('LOWER(product.name) LIKE LOWER(:searchTerm)', {
        searchTerm: `%${searchTerm}%`,
      })
      .orderBy('product.createdAt', 'DESC')
      .getMany();

    return products.map(product => this.mapCustomProductToDto(product));
  }

  // ==================== CUSTOM MEALS METHODS ====================

  /**
   * Create a custom meal
   * @param dto - Custom meal creation data
   * @returns Created custom meal
   */
  async createCustomMeal(
    dto: CreateCustomMealDto,
  ): Promise<CustomMealResponseDto> {
    try {
      // Si hay imagen en base64, subirla a Cloudinary
      let imageUrl: string | undefined = undefined;
      if (dto.image && dto.image.startsWith('data:image')) {
        imageUrl = await this.uploadToCloudinary(dto.image, 'meals');
      } else if (dto.image) {
        imageUrl = dto.image; // URL ya existente
      }

      // Calculate total nutritional values from products
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

  /**
   * Get all custom meals for a user
   * @param userId - User identifier
   * @returns Array of custom meals
   */
  async getCustomMeals(userId: string): Promise<CustomMealResponseDto[]> {
    const meals = await this.customMealRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return meals.map(meal => this.mapCustomMealToDto(meal));
  }

  /**
   * Get a single custom meal by ID
   * @param mealId - Custom meal identifier
   * @returns Custom meal
   * @throws NotFoundException if meal not found
   */
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

  /**
   * Update a custom meal
   * @param mealId - Custom meal identifier
   * @param dto - Update data
   * @param userId - User identifier for validation
   * @returns Updated custom meal
   * @throws NotFoundException if meal not found
   */
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

    // Validate ownership
    if (meal.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para modificar esta comida',
      );
    }

    // Si hay nueva imagen en base64, subirla
    let imageUrl = meal.image;
    if (dto.image && dto.image.startsWith('data:image')) {
      // Eliminar imagen anterior de Cloudinary si existe
      if (meal.image && meal.image.includes('cloudinary.com')) {
        const publicId = this.extractPublicIdFromUrl(meal.image);
        await this.deleteFromCloudinary(publicId);
      }
      imageUrl = await this.uploadToCloudinary(dto.image, 'meals');
    } else if (dto.image !== undefined) {
      imageUrl = dto.image;
    }

    // Update fields if provided
    if (dto.name !== undefined) meal.name = dto.name;
    if (dto.description !== undefined) meal.description = dto.description;
    meal.image = imageUrl;
    if (dto.products !== undefined) {
      meal.products = dto.products;
      // Recalculate totals when products change
      const totals = this.calculateMealTotals(dto.products);
      meal.totalCalories = totals.calories;
      meal.totalProtein = totals.protein;
      meal.totalCarbs = totals.carbs;
      meal.totalFat = totals.fat;
    }

    const updated = await this.customMealRepo.save(meal);
    return this.mapCustomMealToDto(updated);
  }

  /**
   * Search custom meals by name
   * @param userId - User identifier
   * @param searchTerm - Search term for meal name
   * @returns Array of matching custom meals
   */
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

  /**
   * Duplicate a custom meal (create a copy)
   * @param mealId - Custom meal identifier to duplicate
   * @param userId - User identifier for validation
   * @returns Newly created custom meal
   * @throws NotFoundException if meal not found
   */
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

    // Validate ownership
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

  // ==================== HELPER/MAPPER METHODS ====================

  /**
   * Map ShoppingListItemEntity to DTO
   * @param item - Shopping list item entity
   * @returns Shopping list item response DTO
   */
  private mapShoppingListItemToDto(
    item: ShoppingListItemEntity,
  ): ShoppingListItemResponseDto {
    return {
      id: item.id,
      userId: item.userId,
      productCode: item.productCode,
      productName: item.productName,
      productImage: item.productImage,
      quantity: Number(item.quantity),
      unit: item.unit,
      customUnitName: item.customUnitName,
      customUnitGrams: item.customUnitGrams
        ? Number(item.customUnitGrams)
        : undefined,
      purchased: item.purchased,
      createdAt: item.createdAt,
    };
  }

  /**
   * Map FavoriteProductEntity to DTO
   * @param favorite - Favorite product entity
   * @returns Favorite product response DTO
   */
  private mapFavoriteProductToDto(
    favorite: FavoriteProductEntity,
  ): FavoriteProductResponseDto {
    return {
      id: favorite.id,
      userId: favorite.userId,
      productCode: favorite.productCode,
      productName: favorite.productName,
      productImage: favorite.productImage,
      calories: Number(favorite.calories),
      protein: Number(favorite.protein),
      carbs: Number(favorite.carbs),
      fat: Number(favorite.fat),
      createdAt: favorite.createdAt,
    };
  }

  /**
   * Map CustomProductEntity to DTO
   * @param product - Custom product entity
   * @returns Custom product response DTO
   */
  private mapCustomProductToDto(
    product: CustomProductEntity,
  ): CustomProductResponseDto {
    return {
      id: product.id,
      userId: product.userId,
      name: product.name,
      description: product.description,
      image: product.image,
      brand: product.brand,
      caloriesPer100: Number(product.caloriesPer100),
      proteinPer100: Number(product.proteinPer100),
      carbsPer100: Number(product.carbsPer100),
      fatPer100: Number(product.fatPer100),
      fiberPer100: product.fiberPer100
        ? Number(product.fiberPer100)
        : undefined,
      sugarPer100: product.sugarPer100
        ? Number(product.sugarPer100)
        : undefined,
      sodiumPer100: product.sodiumPer100
        ? Number(product.sodiumPer100)
        : undefined,
      servingSize: product.servingSize
        ? Number(product.servingSize)
        : undefined,
      servingUnit: product.servingUnit,
      barcode: product.barcode,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * Map CustomMealEntity to DTO
   * @param meal - Custom meal entity
   * @returns Custom meal response DTO
   */
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

  /**
   * Calculate total nutritional values from meal products
   * @param products - Array of meal products
   * @returns Object with total calories, protein, carbs, and fat
   */
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

  /**
   * Validate if user owns the shopping list item
   * @param itemId - Shopping list item identifier
   * @param userId - User identifier
   * @returns True if user owns the item
   * @throws NotFoundException if item not found or user doesn't own it
   */
  async validateShoppingListOwnership(
    itemId: string,
    userId: string,
  ): Promise<boolean> {
    const item = await this.shoppingListRepo.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(
        `Item de lista de compras no encontrado: ${itemId}`,
      );
    }

    if (item.userId !== userId) {
      throw new NotFoundException('No tienes permiso para acceder a este item');
    }

    return true;
  }

  /**
   * Validate if user owns the favorite product
   * @param favoriteId - Favorite product identifier
   * @param userId - User identifier
   * @returns True if user owns the favorite
   * @throws NotFoundException if favorite not found or user doesn't own it
   */
  async validateFavoriteOwnership(
    favoriteId: string,
    userId: string,
  ): Promise<boolean> {
    const favorite = await this.favoriteProductRepo.findOne({
      where: { id: favoriteId },
    });

    if (!favorite) {
      throw new NotFoundException(
        `Producto favorito no encontrado: ${favoriteId}`,
      );
    }

    if (favorite.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para acceder a este favorito',
      );
    }

    return true;
  }

  /**
   * Validate if user owns the custom product
   * @param productId - Custom product identifier
   * @param userId - User identifier
   * @returns True if user owns the product
   * @throws NotFoundException if product not found or user doesn't own it
   */
  async validateCustomProductOwnership(
    productId: string,
    userId: string,
  ): Promise<boolean> {
    const product = await this.customProductRepo.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(
        `Producto personalizado no encontrado: ${productId}`,
      );
    }

    if (product.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para acceder a este producto',
      );
    }

    return true;
  }

  /**
   * Validate if user owns the custom meal
   * @param mealId - Custom meal identifier
   * @param userId - User identifier
   * @returns True if user owns the meal
   * @throws NotFoundException if meal not found or user doesn't own it
   */
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

  /**
   * Get count of items in shopping list
   * @param userId - User identifier
   * @returns Total count of shopping list items
   */
  async getShoppingListCount(userId: string): Promise<number> {
    return this.shoppingListRepo.count({ where: { userId } });
  }

  /**
   * Get count of favorite products
   * @param userId - User identifier
   * @returns Total count of favorite products
   */
  async getFavoritesCount(userId: string): Promise<number> {
    return this.favoriteProductRepo.count({ where: { userId } });
  }

  /**
   * Get count of custom products
   * @param userId - User identifier
   * @returns Total count of custom products
   */
  async getCustomProductsCount(userId: string): Promise<number> {
    return this.customProductRepo.count({ where: { userId } });
  }

  /**
   * Get count of custom meals
   * @param userId - User identifier
   * @returns Total count of custom meals
   */
  async getCustomMealsCount(userId: string): Promise<number> {
    return this.customMealRepo.count({ where: { userId } });
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
          { width: 800, height: 800, crop: 'limit' }, // Optimizar tamaño
          { quality: 'auto' }, // Calidad automática
          { fetch_format: 'auto' }, // Formato automático (webp si es posible)
        ],
      });

      return result.secure_url;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw new Error('No se pudo subir la imagen');
    }
  }

  private extractPublicIdFromUrl(url: string): string {
    // Extraer public_id de la URL de Cloudinary
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
      // No lanzar error, solo loguearlo
    }
  }

  // Actualizar deleteCustomProduct para limpiar imágenes
  async deleteCustomProduct(productId: string, userId: string): Promise<void> {
    const product = await this.customProductRepo.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(
        `Producto personalizado no encontrado: ${productId}`,
      );
    }

    // Validate ownership
    if (product.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para eliminar este producto',
      );
    }

    // Eliminar imagen de Cloudinary si existe
    if (product.image && product.image.includes('cloudinary.com')) {
      const publicId = this.extractPublicIdFromUrl(product.image);
      await this.deleteFromCloudinary(publicId);
    }

    await this.customProductRepo.delete(productId);
  }

  // Actualizar deleteCustomMeal para limpiar imágenes
  async deleteCustomMeal(mealId: string, userId: string): Promise<void> {
    const meal = await this.customMealRepo.findOne({
      where: { id: mealId },
    });

    if (!meal) {
      throw new NotFoundException(
        `Comida personalizada no encontrada: ${mealId}`,
      );
    }

    // Validate ownership
    if (meal.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para eliminar esta comida',
      );
    }

    // Eliminar imagen de Cloudinary si existe
    if (meal.image && meal.image.includes('cloudinary.com')) {
      const publicId = this.extractPublicIdFromUrl(meal.image);
      await this.deleteFromCloudinary(publicId);
    }

    await this.customMealRepo.delete(mealId);
  }
}
