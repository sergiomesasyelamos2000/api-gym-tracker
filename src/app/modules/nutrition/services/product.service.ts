import {
  CreateCustomProductDto,
  CustomProductEntity,
  CustomProductResponseDto,
  UpdateCustomProductDto,
  CreateFavoriteProductDto,
  FavoriteProductEntity,
  FavoriteProductResponseDto,
} from '@app/entity-data-models';
import { HttpService } from '@nestjs/axios';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import cloudinary from '../../../../config/cloudinary.config';
import NUTRIENT_LABELS_ES from '../../../utils/nutrients-labels';

@Injectable()
export class ProductService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(FavoriteProductEntity)
    private readonly favoriteProductRepo: Repository<FavoriteProductEntity>,
    @InjectRepository(CustomProductEntity)
    private readonly customProductRepo: Repository<CustomProductEntity>,
  ) {}

  // ==================== OPEN FOOD FACTS METHODS ====================

  async scanCode(code: string): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.httpService.get(
          `https://es.openfoodfacts.org/api/v2/product/${code}?fields=product_name,product_name_es,brands,categories,nutrition_grades,nutriments,image_url,code,serving_size&lc=es`,
          {
            headers: {
              'User-Agent': 'GymTrackerApp/1.0',
            },
          },
        ),
      );
      const product = response.data.product;

      if (!product) {
        throw new NotFoundException(
          `Producto con código de barras ${code} no encontrado`,
        );
      }

      // Mapeo completo con información nutricional por 100g
      const mappedProduct = {
        code: product.code,
        name:
          product.product_name_es ??
          product.product_name ??
          'Producto sin nombre',
        brand: product.brands ?? null,
        image: product.image_url ?? null,
        categories: product.categories ?? null,
        nutritionGrade: product.nutrition_grades ?? null,
        servingSize: product.serving_size ?? null,
        grams: 100, // Base de cálculo por 100g
        calories: Math.round(
          product.nutriments?.['energy-kcal_100g'] ??
            product.nutriments?.['energy-kcal'] ??
            0,
        ),
        carbohydrates:
          Math.round(
            (product.nutriments?.['carbohydrates_100g'] ??
              product.nutriments?.['carbohydrates'] ??
              0) * 10,
          ) / 10,
        protein:
          Math.round(
            (product.nutriments?.['proteins_100g'] ??
              product.nutriments?.['proteins'] ??
              0) * 10,
          ) / 10,
        fat:
          Math.round(
            (product.nutriments?.['fat_100g'] ??
              product.nutriments?.['fat'] ??
              0) * 10,
          ) / 10,
        fiber: product.nutriments?.['fiber_100g']
          ? Math.round(product.nutriments['fiber_100g'] * 10) / 10
          : null,
        sugar: product.nutriments?.['sugars_100g']
          ? Math.round(product.nutriments['sugars_100g'] * 10) / 10
          : null,
        sodium: product.nutriments?.['sodium_100g']
          ? Math.round(product.nutriments['sodium_100g'] * 1000) / 10
          : null,
        saturatedFat: product.nutriments?.['saturated-fat_100g']
          ? Math.round(product.nutriments['saturated-fat_100g'] * 10) / 10
          : null,
        others: Object.entries(product.nutriments ?? {})
          .filter(
            ([key]) =>
              ![
                'energy-kcal',
                'energy-kcal_100g',
                'energy',
                'energy_100g',
                'carbohydrates',
                'carbohydrates_100g',
                'proteins',
                'proteins_100g',
                'fat',
                'fat_100g',
                'fiber_100g',
                'sugars_100g',
                'sodium_100g',
                'saturated-fat_100g',
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

  async searchProductsByName(
    searchTerm: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ products: any[]; total: number }> {
    try {
      // Marcas de supermercados españoles para búsqueda prioritaria
      const spanishBrands = [
        'hacendado',
        'dia',
        'carrefour',
        'lidl',
        'eroski',
        'auchan',
        'alcampo',
        'mercadona',
      ];

      // Verificar si el término de búsqueda es una marca específica
      const isSpanishBrand = spanishBrands.some(brand =>
        searchTerm.toLowerCase().includes(brand),
      );

      let allProducts: any[] = [];
      const productCodes = new Set<string>(); // Para evitar duplicados

      // Estrategia 1: Búsqueda general sin restricción de país (más resultados)
      try {
        const generalResponse = await lastValueFrom(
          this.httpService.get(
            `https://es.openfoodfacts.org/cgi/search.pl?` +
              `search_terms=${encodeURIComponent(searchTerm)}&` +
              `search_simple=1&` +
              `action=process&` +
              `json=1&` +
              `page=${page}&` +
              `page_size=${pageSize * 2}&` +
              `sort_by=unique_scans_n&` +
              `fields=product_name,product_name_es,brands,categories,nutrition_grades,nutriments,image_url,code`,
            {
              headers: {
                'User-Agent': 'GymTrackerApp/1.0',
              },
            },
          ),
        );

        const generalProducts = generalResponse.data.products || [];
        generalProducts.forEach((product: any) => {
          if (!productCodes.has(product.code)) {
            allProducts.push(product);
            productCodes.add(product.code);
          }
        });
      } catch (error) {
        console.log('Error en búsqueda general:', error.message);
      }

      // Estrategia 2: Si es una marca española o hay pocos resultados, buscar específicamente por marca
      if (isSpanishBrand || allProducts.length < 10) {
        for (const brand of spanishBrands) {
          if (
            searchTerm.toLowerCase().includes(brand) ||
            allProducts.length < 5
          ) {
            try {
              const brandResponse = await lastValueFrom(
                this.httpService.get(
                  `https://es.openfoodfacts.org/cgi/search.pl?` +
                    `search_terms=${encodeURIComponent(searchTerm)}&` +
                    `tagtype_0=brands&` +
                    `tag_contains_0=contains&` +
                    `tag_0=${brand}&` +
                    `action=process&` +
                    `json=1&` +
                    `page=1&` +
                    `page_size=10&` +
                    `sort_by=unique_scans_n&` +
                    `fields=product_name,product_name_es,brands,categories,nutrition_grades,nutriments,image_url,code`,
                  {
                    headers: {
                      'User-Agent': 'GymTrackerApp/1.0',
                    },
                  },
                ),
              );

              const brandProducts = brandResponse.data.products || [];
              brandProducts.forEach((product: any) => {
                if (!productCodes.has(product.code)) {
                  allProducts.push(product);
                  productCodes.add(product.code);
                }
              });
            } catch (error) {
              console.log(`Error buscando marca ${brand}:`, error.message);
            }

            if (allProducts.length >= pageSize) break;
          }
        }
      }

      // Filtrar y mapear productos
      const mappedProducts = allProducts
        .filter((product: any) => {
          const hasValidName = product.product_name_es || product.product_name;
          const hasCompleteNutrition =
            product.nutriments &&
            product.nutriments['energy-kcal_100g'] !== undefined &&
            product.nutriments['proteins_100g'] !== undefined &&
            product.nutriments['carbohydrates_100g'] !== undefined &&
            product.nutriments['fat_100g'] !== undefined;
          const hasValidCode = product.code && product.code.length > 0;

          return hasValidName && hasCompleteNutrition && hasValidCode;
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
          categories: product.categories ?? null,
          grams: 100,
          calories: Math.round(product.nutriments['energy-kcal_100g'] ?? 0),
          carbohydrates:
            Math.round((product.nutriments['carbohydrates_100g'] ?? 0) * 10) /
            10,
          protein:
            Math.round((product.nutriments['proteins_100g'] ?? 0) * 10) / 10,
          fat: Math.round((product.nutriments['fat_100g'] ?? 0) * 10) / 10,
          fiber: product.nutriments['fiber_100g']
            ? Math.round(product.nutriments['fiber_100g'] * 10) / 10
            : null,
          sugar: product.nutriments['sugars_100g']
            ? Math.round(product.nutriments['sugars_100g'] * 10) / 10
            : null,
        }))
        .sort((a: any, b: any) => {
          const aIsSpanish = spanishBrands.some(brand =>
            a.brand?.toLowerCase().includes(brand),
          );
          const bIsSpanish = spanishBrands.some(brand =>
            b.brand?.toLowerCase().includes(brand),
          );

          if (aIsSpanish && !bIsSpanish) return -1;
          if (!aIsSpanish && bIsSpanish) return 1;
          return 0;
        })
        .slice(0, pageSize);

      return {
        products: mappedProducts,
        total: mappedProducts.length,
      };
    } catch (error) {
      console.error('Error buscando productos por nombre:', error);
      return {
        products: [],
        total: 0,
      };
    }
  }

  async getAllProducts(
    page: number = 1,
    pageSize: number = 100,
  ): Promise<{ products: any[]; total: number }> {
    try {
      const response = await lastValueFrom(
        this.httpService.get(
          `https://es.openfoodfacts.org/api/v2/search?` +
            `fields=product_name,product_name_es,brands,categories,nutrition_grades,nutriments,image_url,code&` +
            `page=${page}&` +
            `page_size=${pageSize * 2}&` +
            `sort_by=unique_scans_n&` +
            `json=1`,
          {
            headers: {
              'User-Agent': 'GymTrackerApp/1.0',
            },
          },
        ),
      );

      const products = response.data.products || [];
      const spanishBrands = [
        'hacendado',
        'dia',
        'carrefour',
        'lidl',
        'eroski',
        'auchan',
        'alcampo',
        'mercadona',
      ];

      const mappedProducts = products
        .filter((product: any) => {
          const hasValidName = product.product_name_es || product.product_name;
          const hasCompleteNutrition =
            product.nutriments &&
            product.nutriments['energy-kcal_100g'] !== undefined &&
            product.nutriments['proteins_100g'] !== undefined &&
            product.nutriments['carbohydrates_100g'] !== undefined &&
            product.nutriments['fat_100g'] !== undefined;
          const hasValidCode = product.code && product.code.length > 0;

          return hasValidName && hasCompleteNutrition && hasValidCode;
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
          categories: product.categories ?? null,
          grams: 100,
          calories: Math.round(product.nutriments['energy-kcal_100g'] ?? 0),
          carbohydrates:
            Math.round((product.nutriments['carbohydrates_100g'] ?? 0) * 10) /
            10,
          protein:
            Math.round((product.nutriments['proteins_100g'] ?? 0) * 10) / 10,
          fat: Math.round((product.nutriments['fat_100g'] ?? 0) * 10) / 10,
          fiber: product.nutriments['fiber_100g']
            ? Math.round(product.nutriments['fiber_100g'] * 10) / 10
            : null,
          sugar: product.nutriments['sugars_100g']
            ? Math.round(product.nutriments['sugars_100g'] * 10) / 10
            : null,
          sodium: product.nutriments['sodium_100g']
            ? Math.round(product.nutriments['sodium_100g'] * 1000) / 10
            : null,
          others: Object.entries(product.nutriments ?? {})
            .filter(
              ([key]) =>
                ![
                  'energy-kcal',
                  'energy-kcal_100g',
                  'energy',
                  'energy_100g',
                  'carbohydrates',
                  'carbohydrates_100g',
                  'proteins',
                  'proteins_100g',
                  'fat',
                  'fat_100g',
                  'fiber_100g',
                  'sugars_100g',
                  'sodium_100g',
                  'nova',
                ].some(main => key.startsWith(main)),
            )
            .map(([key, value]) => ({
              label: NUTRIENT_LABELS_ES[key] ?? key,
              value,
            })),
        }))
        .sort((a: any, b: any) => {
          const aIsSpanish = spanishBrands.some(brand =>
            a.brand?.toLowerCase().includes(brand),
          );
          const bIsSpanish = spanishBrands.some(brand =>
            b.brand?.toLowerCase().includes(brand),
          );

          if (aIsSpanish && !bIsSpanish) return -1;
          if (!aIsSpanish && bIsSpanish) return 1;
          return 0;
        })
        .slice(0, pageSize);

      return {
        products: mappedProducts,
        total: mappedProducts.length,
      };
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      return {
        products: [],
        total: 0,
      };
    }
  }

  async getProductDetail(code: string): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.httpService.get(
          `https://es.openfoodfacts.org/api/v2/product/${code}?fields=product_name,product_name_es,brands,categories,nutrition_grades,nutriments,image_url,code,serving_size&lc=es`,
          {
            headers: {
              'User-Agent': 'GymTrackerApp/1.0',
            },
          },
        ),
      );

      const product = response.data.product;

      if (!product) {
        throw new NotFoundException(
          `Producto con código ${code} no encontrado`,
        );
      }

      const mappedProduct = {
        code: product.code,
        name:
          product.product_name_es ??
          product.product_name ??
          'Producto sin nombre',
        brand: product.brands ?? null,
        image: product.image_url ?? null,
        nutritionGrade: product.nutrition_grades ?? null,
        categories: product.categories ?? null,
        servingSize: product.serving_size ?? null,
        grams: 100,
        calories: Math.round(
          product.nutriments?.['energy-kcal_100g'] ??
            product.nutriments?.['energy-kcal'] ??
            0,
        ),
        carbohydrates:
          Math.round(
            (product.nutriments?.['carbohydrates_100g'] ??
              product.nutriments?.['carbohydrates'] ??
              0) * 10,
          ) / 10,
        protein:
          Math.round(
            (product.nutriments?.['proteins_100g'] ??
              product.nutriments?.['proteins'] ??
              0) * 10,
          ) / 10,
        fat:
          Math.round(
            (product.nutriments?.['fat_100g'] ??
              product.nutriments?.['fat'] ??
              0) * 10,
          ) / 10,
        fiber: product.nutriments?.['fiber_100g']
          ? Math.round(product.nutriments['fiber_100g'] * 10) / 10
          : null,
        sugar: product.nutriments?.['sugars_100g']
          ? Math.round(product.nutriments['sugars_100g'] * 10) / 10
          : null,
        sodium: product.nutriments?.['sodium_100g']
          ? Math.round(product.nutriments['sodium_100g'] * 1000) / 10
          : null,
        saturatedFat: product.nutriments?.['saturated-fat_100g']
          ? Math.round(product.nutriments['saturated-fat_100g'] * 10) / 10
          : null,
        others: Object.entries(product.nutriments ?? {})
          .filter(
            ([key]) =>
              ![
                'energy-kcal',
                'energy-kcal_100g',
                'energy',
                'energy_100g',
                'carbohydrates',
                'carbohydrates_100g',
                'proteins',
                'proteins_100g',
                'fat',
                'fat_100g',
                'fiber_100g',
                'sugars_100g',
                'sodium_100g',
                'saturated-fat_100g',
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

  // ==================== FAVORITE PRODUCTS METHODS ====================

  async addFavorite(
    dto: CreateFavoriteProductDto,
  ): Promise<FavoriteProductResponseDto> {
    const existing = await this.favoriteProductRepo.findOne({
      where: {
        userId: dto.userId,
        productCode: dto.productCode,
      },
    });

    if (existing) {
      return this.mapFavoriteProductToDto(existing);
    }

    const favorite = this.favoriteProductRepo.create(dto);
    const saved = await this.favoriteProductRepo.save(favorite);
    return this.mapFavoriteProductToDto(saved);
  }

  async getFavorites(userId: string): Promise<FavoriteProductResponseDto[]> {
    const favorites = await this.favoriteProductRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return favorites.map(fav => this.mapFavoriteProductToDto(fav));
  }

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

  async isFavorite(userId: string, productCode: string): Promise<boolean> {
    const favorite = await this.favoriteProductRepo.findOne({
      where: { userId, productCode },
    });

    return !!favorite;
  }

  async removeFavorite(favoriteId: string): Promise<void> {
    const result = await this.favoriteProductRepo.delete(favoriteId);

    if (result.affected === 0) {
      throw new NotFoundException(
        `Producto favorito no encontrado: ${favoriteId}`,
      );
    }
  }

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

  async getFavoritesCount(userId: string): Promise<number> {
    return this.favoriteProductRepo.count({ where: { userId } });
  }

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

  // ==================== CUSTOM PRODUCTS METHODS ====================

  async createCustomProduct(
    dto: CreateCustomProductDto,
  ): Promise<CustomProductResponseDto> {
    try {
      let imageUrl: string | undefined = undefined;
      if (dto.image && dto.image.startsWith('data:image')) {
        imageUrl = await this.uploadToCloudinary(dto.image, 'products');
      } else if (dto.image) {
        imageUrl = dto.image;
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

  async getCustomProducts(userId: string): Promise<CustomProductResponseDto[]> {
    const products = await this.customProductRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return products.map(product => this.mapCustomProductToDto(product));
  }

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

  async getCustomProductByBarcode(
    userId: string,
    barcode: string,
  ): Promise<CustomProductResponseDto | null> {
    const product = await this.customProductRepo.findOne({
      where: { userId, barcode },
    });

    return product ? this.mapCustomProductToDto(product) : null;
  }

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

    if (product.userId !== userId) {
      throw new NotFoundException(
        'No tienes permiso para modificar este producto',
      );
    }

    let imageUrl = product.image;
    if (dto.image && dto.image.startsWith('data:image')) {
      if (product.image && product.image.includes('cloudinary.com')) {
        const publicId = this.extractPublicIdFromUrl(product.image);
        await this.deleteFromCloudinary(publicId);
      }
      imageUrl = await this.uploadToCloudinary(dto.image, 'products');
    } else if (dto.image !== undefined) {
      imageUrl = dto.image;
    }

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

  async deleteCustomProduct(productId: string, userId: string): Promise<void> {
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
        'No tienes permiso para eliminar este producto',
      );
    }

    if (product.image && product.image.includes('cloudinary.com')) {
      const publicId = this.extractPublicIdFromUrl(product.image);
      await this.deleteFromCloudinary(publicId);
    }

    await this.customProductRepo.delete(productId);
  }

  async getCustomProductsCount(userId: string): Promise<number> {
    return this.customProductRepo.count({ where: { userId } });
  }

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
