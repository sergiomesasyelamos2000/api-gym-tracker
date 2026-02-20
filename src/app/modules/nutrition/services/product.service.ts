import {
  CreateCustomProductDto,
  CustomProductEntity,
  CustomProductResponseDto,
  UpdateCustomProductDto,
  CreateFavoriteProductDto,
  FavoriteProductEntity,
  FavoriteProductResponseDto,
  MappedProduct,
  OpenFoodFactsProduct,
  OpenFoodFactsResponse,
} from '@app/entity-data-models';
import { HttpService } from '@nestjs/axios';
import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { DataSource, Repository } from 'typeorm';
import cloudinary from '../../../../config/cloudinary.config';
import NUTRIENT_LABELS_ES from '../../../utils/nutrients-labels';

interface USDAFood {
  fdcId: number;
  description?: string;
  gtinUpc?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: Array<{
    nutrientName?: string;
    unitName?: string;
    value?: number;
  }>;
}

interface USDAFoodsSearchResponse {
  foods?: USDAFood[];
}

interface NutritionixResponse {
  branded?: Array<{
    nix_item_id?: string;
    food_name?: string;
    brand_name?: string;
    serving_qty?: number;
    serving_unit?: string;
    photo?: { thumb?: string };
    full_nutrients?: Array<{ attr_id?: number; value?: number }>;
  }>;
}

interface EdamamParserResponse {
  hints?: Array<{
    food?: {
      foodId?: string;
      label?: string;
      brand?: string;
      nutrients?: {
        ENERC_KCAL?: number;
        PROCNT?: number;
        CHOCDF?: number;
        FAT?: number;
        FIBTG?: number;
        SUGAR?: number;
        NA?: number;
      };
      image?: string;
      category?: string;
      categoryLabel?: string;
    };
  }>;
}

interface FatSecretOAuthResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

interface FatSecretFood {
  food_id?: string;
  food_name?: string;
  brand_name?: string;
  food_description?: string;
}

interface FatSecretFoodsResponse {
  foods?: {
    food?: FatSecretFood[] | FatSecretFood;
  };
}

@Injectable()
export class ProductService implements OnModuleInit {
  private readonly searchCache = new Map<
    string,
    { expiresAt: number; value: { products: MappedProduct[]; total: number } }
  >();
  private readonly SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
  private readonly OFF_TIMEOUT_MS = 3000;
  private readonly USDA_TIMEOUT_MS = 3000;
  private readonly OVERLAY_TIMEOUT_MS = 3000;
  private readonly overlaySearchCache = new Map<
    string,
    { expiresAt: number; value: MappedProduct[] }
  >();
  private readonly OVERLAY_CACHE_TTL_MS =
    Number(process.env.NUTRITION_PROVIDER_OVERLAY_TTL_MS ?? 5 * 60 * 1000) ||
    5 * 60 * 1000;
  private fatSecretToken: { token: string; expiresAt: number } | null = null;
  private readonly spanishBrands = [
    'hacendado',
    'dia',
    'carrefour',
    'lidl',
    'eroski',
    'auchan',
    'alcampo',
    'mercadona',
  ];
  private readonly brandSynonyms: Record<string, string[]> = {
    mercadona: ['hacendado'],
    hacendado: ['mercadona'],
    carrefour: ['carrefour bio'],
    lidl: ['milbona'],
    dia: ['dia'],
    eroski: ['eroski'],
  };
  private readonly preloadSeedTerms = [
    'avena',
    'copos avena',
    'avena hacendado',
    'copos de avena hacendado',
    'bebida avena',
    'granola',
    'muesli',
    'arroz',
    'pasta',
    'pan integral',
  ];

  constructor(
    private readonly httpService: HttpService,
    private readonly dataSource: DataSource,
    @InjectRepository(FavoriteProductEntity)
    private readonly favoriteProductRepo: Repository<FavoriteProductEntity>,
    @InjectRepository(CustomProductEntity)
    private readonly customProductRepo: Repository<CustomProductEntity>,
  ) {}

  onModuleInit() {
    // Warm up catalog in background without blocking app startup.
    setTimeout(() => {
      void this.preloadPopularCatalogTerms();
    }, 2500);
  }

  private normalizeSearchValue(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private normalizeKeyPart(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private parseBrandFilters(brandFilter?: string): string[] {
    return (brandFilter ?? '')
      .split(',')
      .map(value => value.trim().toLowerCase())
      .filter(Boolean);
  }

  private matchesBrandFilters(
    brandValue: string | null | undefined,
    brandFilters: string[],
  ): boolean {
    if (brandFilters.length === 0) return true;
    const normalized = (brandValue ?? '').toLowerCase();
    return brandFilters.some(filter => normalized.includes(filter));
  }

  private buildSearchVariants(normalizedSearch: string): string[] {
    const variants = new Set<string>([normalizedSearch]);
    const compact = normalizedSearch
      .replace(/\b(de|del|la|el|los|las|con|para)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (compact && compact !== normalizedSearch) {
      variants.add(compact);
    }

    for (const [brand, syns] of Object.entries(this.brandSynonyms)) {
      if (normalizedSearch.includes(brand)) {
        for (const syn of syns) {
          variants.add(normalizedSearch.replace(brand, syn));
          variants.add(`${compact || normalizedSearch} ${syn}`.trim());
        }
      }
    }

    if (
      normalizedSearch.includes('copos') &&
      normalizedSearch.includes('avena')
    ) {
      variants.add('avena');
      variants.add('copos avena');
      variants.add('oat flakes');
      variants.add('oatmeal');
    }

    if (normalizedSearch.includes('oat')) {
      variants.add('avena');
      variants.add('copos avena');
    }

    return Array.from(variants)
      .map(v => this.normalizeSearchValue(v))
      .filter(v => v.length >= 2)
      .slice(0, 8);
  }

  private isSpanishBrand(brand: string | null | undefined): boolean {
    const value = (brand ?? '').toLowerCase();
    return this.spanishBrands.some(entry => value.includes(entry));
  }

  private scoreProductByQuery(product: MappedProduct, query: string): number {
    const name = (product.name ?? '').toLowerCase();
    const brand = (product.brand ?? '').toLowerCase();
    let score = 0;

    if (name === query) score += 200;
    if (name.startsWith(query)) score += 120;
    if (name.includes(query)) score += 80;
    if (brand.includes(query)) score += 70;

    const tokens = query.split(' ').filter(Boolean);
    for (const token of tokens) {
      if (name.includes(token)) score += 20;
      if (brand.includes(token)) score += 15;
    }

    if (this.isSpanishBrand(product.brand)) score += 50;
    if (product.code?.trim()) score += 10;
    return score;
  }

  private rankProducts(products: MappedProduct[], variants: string[]): MappedProduct[] {
    return [...products].sort((a, b) => {
      const aScore = variants.reduce(
        (acc, variant) => Math.max(acc, this.scoreProductByQuery(a, variant)),
        0,
      );
      const bScore = variants.reduce(
        (acc, variant) => Math.max(acc, this.scoreProductByQuery(b, variant)),
        0,
      );

      if (aScore !== bScore) return bScore - aScore;
      return 0;
    });
  }

  private async preloadPopularCatalogTerms(): Promise<void> {
    for (const term of this.preloadSeedTerms) {
      try {
        await this.searchProductsByName(term, 1, 20, false);
      } catch (error) {
        console.warn(`Catalog preload failed for "${term}"`, error?.message || error);
      }
    }
  }

  private buildExactProductKey(product: MappedProduct): string {
    return `${this.normalizeKeyPart(product.name)}|${this.normalizeKeyPart(
      product.brand ?? '',
    )}|${this.normalizeKeyPart(product.servingSize ?? '')}`;
  }

  private async searchLocalCatalog(
    normalizedSearch: string,
    page: number,
    pageSize: number,
  ): Promise<MappedProduct[]> {
    const pattern = `%${normalizedSearch}%`;
    const prefix = `${normalizedSearch}%`;
    const offset = Math.max(0, (page - 1) * pageSize);

    const rows = await this.dataSource.query(
      `
        SELECT
          p.barcode_gtin AS "code",
          p.canonical_name AS "name",
          p.canonical_brand AS "brand",
          p.image_url AS "image",
          p.serving_size AS "servingSize",
          n.calories AS "calories",
          n.protein AS "protein",
          n.carbs AS "carbohydrates",
          n.fat AS "fat",
          n.fiber AS "fiber",
          n.sugar AS "sugar",
          n.sodium AS "sodium"
        FROM nutrition_products_master p
        LEFT JOIN nutrition_product_nutrients_per_100g n
          ON n.product_id = p.id
        WHERE p.canonical_name ILIKE $1
          OR COALESCE(p.canonical_brand, '') ILIKE $1
        ORDER BY
          CASE WHEN p.canonical_name ILIKE $2 THEN 0 ELSE 1 END,
          p.quality_score DESC,
          p.updated_at DESC
        LIMIT $3
        OFFSET $4
      `,
      [pattern, prefix, pageSize, offset],
    );

    return rows.map((row: any) => ({
      code: row.code,
      name: row.name ?? 'Producto sin nombre',
      brand: row.brand ?? null,
      image: row.image ?? null,
      categories: null,
      nutritionGrade: null,
      servingSize: row.servingSize ?? null,
      grams: 100,
      calories: Number(row.calories ?? 0),
      protein: Number(row.protein ?? 0),
      carbohydrates: Number(row.carbohydrates ?? 0),
      fat: Number(row.fat ?? 0),
      fiber: row.fiber !== null ? Number(row.fiber) : null,
      sugar: row.sugar !== null ? Number(row.sugar) : null,
      sodium: row.sodium !== null ? Number(row.sodium) : null,
      others: [],
    }));
  }

  private async saveProductsToCatalog(
    products: MappedProduct[],
    source: string,
    licenseTag: string,
  ): Promise<void> {
    if (!products.length) return;

    for (const product of products) {
      const code = product.code?.trim();
      const name = product.name?.trim();
      if (!name) {
        continue;
      }
      const servingSize = product.servingSize ?? null;
      const brand = product.brand ?? null;
      const image = product.image ?? null;

      let masterRows: Array<{ id: number }> = [];

      if (code) {
        masterRows = await this.dataSource.query(
          `
            INSERT INTO nutrition_products_master (
              canonical_name,
              canonical_brand,
              barcode_gtin,
              serving_size,
              image_url,
              quality_score,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, now())
            ON CONFLICT (barcode_gtin) WHERE barcode_gtin IS NOT NULL
            DO UPDATE SET
              canonical_name = EXCLUDED.canonical_name,
              canonical_brand = EXCLUDED.canonical_brand,
              serving_size = EXCLUDED.serving_size,
              image_url = EXCLUDED.image_url,
              quality_score = GREATEST(nutrition_products_master.quality_score, EXCLUDED.quality_score),
              updated_at = now()
            RETURNING id
          `,
          [name, brand, code, servingSize, image, 100],
        );
      } else {
        const existingRows = await this.dataSource.query(
          `
            SELECT id
            FROM nutrition_products_master
            WHERE lower(trim(canonical_name)) = lower(trim($1))
              AND coalesce(lower(trim(canonical_brand)), '') = coalesce(lower(trim($2)), '')
              AND coalesce(lower(trim(serving_size)), '') = coalesce(lower(trim($3)), '')
            LIMIT 1
          `,
          [name, brand, servingSize],
        );

        if (existingRows.length > 0) {
          masterRows = existingRows;
          await this.dataSource.query(
            `
              UPDATE nutrition_products_master
              SET
                image_url = coalesce($2, image_url),
                quality_score = GREATEST(quality_score, $3),
                updated_at = now()
              WHERE id = $1
            `,
            [existingRows[0].id, image, 90],
          );
        } else {
          masterRows = await this.dataSource.query(
            `
              INSERT INTO nutrition_products_master (
                canonical_name,
                canonical_brand,
                barcode_gtin,
                serving_size,
                image_url,
                quality_score,
                updated_at
              )
              VALUES ($1, $2, NULL, $3, $4, $5, now())
              RETURNING id
            `,
            [name, brand, servingSize, image, 90],
          );
        }
      }

      const productId = masterRows?.[0]?.id;
      if (!productId) continue;

      await this.dataSource.query(
        `
          INSERT INTO nutrition_product_nutrients_per_100g (
            product_id,
            calories,
            protein,
            carbs,
            fat,
            fiber,
            sugar,
            sodium,
            saturated_fat,
            raw_json
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
          ON CONFLICT (product_id)
          DO UPDATE SET
            calories = EXCLUDED.calories,
            protein = EXCLUDED.protein,
            carbs = EXCLUDED.carbs,
            fat = EXCLUDED.fat,
            fiber = EXCLUDED.fiber,
            sugar = EXCLUDED.sugar,
            sodium = EXCLUDED.sodium,
            saturated_fat = EXCLUDED.saturated_fat,
            raw_json = EXCLUDED.raw_json
        `,
        [
          productId,
          product.calories ?? 0,
          product.protein ?? 0,
          product.carbohydrates ?? 0,
          product.fat ?? 0,
          product.fiber ?? null,
          product.sugar ?? null,
          product.sodium ?? null,
          (product as any).saturatedFat ?? null,
          JSON.stringify(product),
        ],
      );

      await this.dataSource.query(
        `
          INSERT INTO nutrition_product_sources (
            product_id,
            source,
            source_product_id,
            license_tag,
            last_seen_at,
            raw_payload
          )
          VALUES ($1, $2, $3, $4, now(), $5::jsonb)
          ON CONFLICT (source, source_product_id)
          DO UPDATE SET
            product_id = EXCLUDED.product_id,
            license_tag = EXCLUDED.license_tag,
            last_seen_at = now(),
            raw_payload = EXCLUDED.raw_payload
        `,
        [
          productId,
          source,
          code || this.buildExactProductKey(product),
          licenseTag,
          JSON.stringify(product),
        ],
      );
    }
  }

  private mergeUniqueProducts(products: MappedProduct[]): MappedProduct[] {
    const byCode = new Map<string, MappedProduct>();
    const byNameBrandServing = new Map<string, MappedProduct>();

    for (const product of products) {
      const codeKey = product.code?.trim();
      if (codeKey) {
        if (!byCode.has(codeKey)) {
          byCode.set(codeKey, product);
        }
        continue;
      }

      const nameBrandServingKey = this.buildExactProductKey(product);
      if (!byNameBrandServing.has(nameBrandServingKey)) {
        byNameBrandServing.set(nameBrandServingKey, product);
      }
    }

    return [
      ...Array.from(byCode.values()),
      ...Array.from(byNameBrandServing.values()),
    ];
  }

  private isOverlayEnabled(): boolean {
    return (
      process.env.NUTRITION_PROVIDER_OVERLAY_ENABLED === 'true' ||
      process.env.NUTRITION_PROVIDER_OVERLAY_ENABLED === '1'
    );
  }

  private getNutritionixNutrient(
    nutrients: Array<{ attr_id?: number; value?: number }> | undefined,
    attrId: number,
  ): number | null {
    const nutrient = (nutrients ?? []).find(n => n.attr_id === attrId);
    const value = nutrient?.value;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private async searchNutritionixProductsByName(
    searchTerm: string,
    pageSize: number,
  ): Promise<MappedProduct[]> {
    const appId = process.env.NUTRITIONIX_APP_ID?.trim();
    const appKey = process.env.NUTRITIONIX_APP_KEY?.trim();
    if (!appId || !appKey) return [];

    try {
      const response = await lastValueFrom(
        this.httpService.get<NutritionixResponse>(
          'https://trackapi.nutritionix.com/v2/search/instant',
          {
            params: {
              query: searchTerm,
              branded: true,
              common: false,
            },
            headers: {
              'x-app-id': appId,
              'x-app-key': appKey,
            },
            timeout: this.OVERLAY_TIMEOUT_MS,
          },
        ),
      );

      const branded = response.data?.branded ?? [];
      return branded
        .map(item => {
          const calories = this.getNutritionixNutrient(item.full_nutrients, 208);
          const protein = this.getNutritionixNutrient(item.full_nutrients, 203);
          const carbs = this.getNutritionixNutrient(item.full_nutrients, 205);
          const fat = this.getNutritionixNutrient(item.full_nutrients, 204);
          const fiber = this.getNutritionixNutrient(item.full_nutrients, 291);
          const sugar = this.getNutritionixNutrient(item.full_nutrients, 269);
          const sodium = this.getNutritionixNutrient(item.full_nutrients, 307);

          const name = item.food_name?.trim();
          if (!name) return null;

          return {
            code: `nutritionix-${item.nix_item_id ?? name.toLowerCase()}`,
            name,
            brand: item.brand_name?.trim() ?? null,
            image: item.photo?.thumb ?? null,
            categories: null,
            nutritionGrade: null,
            servingSize:
              item.serving_qty && item.serving_unit
                ? `${item.serving_qty} ${item.serving_unit}`
                : null,
            grams: 100,
            calories: Math.round(calories ?? 0),
            protein: Math.round((protein ?? 0) * 10) / 10,
            carbohydrates: Math.round((carbs ?? 0) * 10) / 10,
            fat: Math.round((fat ?? 0) * 10) / 10,
            fiber: fiber !== null ? Math.round(fiber * 10) / 10 : null,
            sugar: sugar !== null ? Math.round(sugar * 10) / 10 : null,
            sodium: sodium !== null ? Math.round(sodium * 10) / 10 : null,
            others: [],
          } as MappedProduct;
        })
        .filter((item): item is MappedProduct => !!item)
        .slice(0, pageSize);
    } catch (error) {
      console.warn('Nutritionix overlay search failed:', error?.message || error);
      return [];
    }
  }

  private async searchEdamamProductsByName(
    searchTerm: string,
    pageSize: number,
  ): Promise<MappedProduct[]> {
    const appId = process.env.EDAMAM_APP_ID?.trim();
    const appKey = process.env.EDAMAM_APP_KEY?.trim();
    if (!appId || !appKey) return [];

    try {
      const response = await lastValueFrom(
        this.httpService.get<EdamamParserResponse>(
          'https://api.edamam.com/api/food-database/v2/parser',
          {
            params: {
              app_id: appId,
              app_key: appKey,
              ingr: searchTerm,
            },
            timeout: this.OVERLAY_TIMEOUT_MS,
          },
        ),
      );

      return (response.data?.hints ?? [])
        .map(hint => {
          const food = hint.food;
          const name = food?.label?.trim();
          if (!food || !name) return null;

          return {
            code: `edamam-${food.foodId ?? name.toLowerCase()}`,
            name,
            brand: food.brand?.trim() ?? null,
            image: food.image ?? null,
            categories:
              food.category && food.categoryLabel
                ? `${food.categoryLabel}:${food.category}`
                : null,
            nutritionGrade: null,
            servingSize: null,
            grams: 100,
            calories: Math.round(food.nutrients?.ENERC_KCAL ?? 0),
            protein: Math.round((food.nutrients?.PROCNT ?? 0) * 10) / 10,
            carbohydrates: Math.round((food.nutrients?.CHOCDF ?? 0) * 10) / 10,
            fat: Math.round((food.nutrients?.FAT ?? 0) * 10) / 10,
            fiber:
              food.nutrients?.FIBTG !== undefined
                ? Math.round(food.nutrients.FIBTG * 10) / 10
                : null,
            sugar:
              food.nutrients?.SUGAR !== undefined
                ? Math.round(food.nutrients.SUGAR * 10) / 10
                : null,
            sodium:
              food.nutrients?.NA !== undefined
                ? Math.round(food.nutrients.NA * 10) / 10
                : null,
            others: [],
          } as MappedProduct;
        })
        .filter((item): item is MappedProduct => !!item)
        .slice(0, pageSize);
    } catch (error) {
      console.warn('Edamam overlay search failed:', error?.message || error);
      return [];
    }
  }

  private async getFatSecretAccessToken(): Promise<string | null> {
    const clientId = process.env.FATSECRET_CLIENT_ID?.trim();
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) return null;

    if (this.fatSecretToken && this.fatSecretToken.expiresAt > Date.now() + 5000) {
      return this.fatSecretToken.token;
    }

    try {
      const body = new URLSearchParams();
      body.append('grant_type', 'client_credentials');
      body.append('scope', 'basic');

      const response = await lastValueFrom(
        this.httpService.post<FatSecretOAuthResponse>(
          'https://oauth.fatsecret.com/connect/token',
          body.toString(),
          {
            headers: {
              Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: this.OVERLAY_TIMEOUT_MS,
          },
        ),
      );

      const token = response.data?.access_token;
      if (!token) return null;

      const expiresIn = Number(response.data?.expires_in ?? 3600);
      this.fatSecretToken = {
        token,
        expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
      };
      return token;
    } catch (error) {
      console.warn('FatSecret token request failed:', error?.message || error);
      return null;
    }
  }

  private parseFatSecretDescription(description: string | undefined): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } {
    const text = (description ?? '').toLowerCase();
    const getValue = (pattern: RegExp) => {
      const match = text.match(pattern);
      return match ? Number((match[1] ?? '0').replace(',', '.')) || 0 : 0;
    };

    return {
      calories: getValue(/calories:\s*([0-9.,]+)/i),
      fat: getValue(/fat:\s*([0-9.,]+)/i),
      carbs: getValue(/carbs?:\s*([0-9.,]+)/i),
      protein: getValue(/protein:\s*([0-9.,]+)/i),
    };
  }

  private async searchFatSecretProductsByName(
    searchTerm: string,
    pageSize: number,
  ): Promise<MappedProduct[]> {
    const token = await this.getFatSecretAccessToken();
    if (!token) return [];

    try {
      const response = await lastValueFrom(
        this.httpService.get<FatSecretFoodsResponse>(
          'https://platform.fatsecret.com/rest/server.api',
          {
            params: {
              method: 'foods.search',
              search_expression: searchTerm,
              format: 'json',
              max_results: pageSize,
              page_number: 0,
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: this.OVERLAY_TIMEOUT_MS,
          },
        ),
      );

      const raw = response.data?.foods?.food;
      const foods = Array.isArray(raw) ? raw : raw ? [raw] : [];

      return foods
        .map(food => {
          const name = food.food_name?.trim();
          if (!name) return null;
          const macros = this.parseFatSecretDescription(food.food_description);
          return {
            code: `fatsecret-${food.food_id ?? name.toLowerCase()}`,
            name,
            brand: food.brand_name?.trim() ?? null,
            image: null,
            categories: null,
            nutritionGrade: null,
            servingSize: null,
            grams: 100,
            calories: Math.round(macros.calories ?? 0),
            protein: Math.round((macros.protein ?? 0) * 10) / 10,
            carbohydrates: Math.round((macros.carbs ?? 0) * 10) / 10,
            fat: Math.round((macros.fat ?? 0) * 10) / 10,
            fiber: null,
            sugar: null,
            sodium: null,
            others: [],
          } as MappedProduct;
        })
        .filter((item): item is MappedProduct => !!item)
        .slice(0, pageSize);
    } catch (error) {
      console.warn('FatSecret overlay search failed:', error?.message || error);
      return [];
    }
  }

  private async searchOverlayProvidersByName(
    searchTerm: string,
    page: number,
    pageSize: number,
  ): Promise<MappedProduct[]> {
    if (!this.isOverlayEnabled()) {
      return [];
    }

    const cacheKey = `overlay:${searchTerm}:${page}:${pageSize}`;
    const cached = this.overlaySearchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const [nutritionixProducts, edamamProducts, fatSecretProducts] = await Promise.all([
      this.searchNutritionixProductsByName(searchTerm, pageSize),
      this.searchEdamamProductsByName(searchTerm, pageSize),
      this.searchFatSecretProductsByName(searchTerm, pageSize),
    ]);

    const merged = this.mergeUniqueProducts([
      ...nutritionixProducts,
      ...edamamProducts,
      ...fatSecretProducts,
    ]).slice(0, pageSize);

    this.overlaySearchCache.set(cacheKey, {
      expiresAt: Date.now() + this.OVERLAY_CACHE_TTL_MS,
      value: merged,
    });

    return merged;
  }

  private getUSDANutrient(
    food: USDAFood,
    names: string[],
  ): number | null {
    const nutrient = (food.foodNutrients ?? []).find(n =>
      names.some(name => n.nutrientName?.toLowerCase() === name.toLowerCase()),
    );
    const value = nutrient?.value;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private mapUSDAFoodToMappedProduct(food: USDAFood): MappedProduct | null {
    const name = food.description?.trim();
    if (!name) return null;

    const calories = this.getUSDANutrient(food, ['Energy']) ?? 0;
    const protein = this.getUSDANutrient(food, ['Protein']) ?? 0;
    const carbs =
      this.getUSDANutrient(food, ['Carbohydrate, by difference']) ?? 0;
    const fat = this.getUSDANutrient(food, ['Total lipid (fat)']) ?? 0;
    const fiber =
      this.getUSDANutrient(food, ['Fiber, total dietary']) ?? null;
    const sugar = this.getUSDANutrient(food, [
      'Sugars, total including NLEA',
      'Sugars, total',
    ]);
    const sodium = this.getUSDANutrient(food, ['Sodium, Na']);

    const serving =
      food.servingSize && food.servingSizeUnit
        ? `${food.servingSize} ${food.servingSizeUnit}`
        : null;

    return {
      code: food.gtinUpc?.trim() || `usda-${food.fdcId}`,
      name,
      brand: food.brandOwner?.trim() || null,
      image: null,
      categories: null,
      nutritionGrade: null,
      servingSize: serving,
      grams: 100,
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbohydrates: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: fiber !== null ? Math.round(fiber * 10) / 10 : null,
      sugar: sugar !== null ? Math.round(sugar * 10) / 10 : null,
      sodium: sodium !== null ? Math.round(sodium * 10) / 10 : null,
      others: [],
    };
  }

  private async searchUSDAProductsByName(
    searchTerm: string,
    page: number,
    pageSize: number,
  ): Promise<MappedProduct[]> {
    const apiKey = process.env.USDA_API_KEY?.trim();
    if (!apiKey) {
      return [];
    }

    try {
      const usdaPage = Math.max(1, page);
      const response = await lastValueFrom(
        this.httpService.get<USDAFoodsSearchResponse>(
          `https://api.nal.usda.gov/fdc/v1/foods/search`,
          {
            params: {
              api_key: apiKey,
              query: searchTerm,
              pageNumber: usdaPage,
              pageSize: pageSize * 2,
            },
            timeout: this.USDA_TIMEOUT_MS,
          },
        ),
      );

      const foods = response.data?.foods ?? [];
      const mapped = foods
        .map(food => this.mapUSDAFoodToMappedProduct(food))
        .filter((item): item is MappedProduct => !!item)
        .slice(0, pageSize);

      return mapped;
    } catch (error) {
      console.warn('USDA search failed:', error?.message || error);
      return [];
    }
  }

  // ==================== OPEN FOOD FACTS METHODS ====================

  async scanCode(code: string): Promise<MappedProduct> {
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
      const product = response.data.product as OpenFoodFactsProduct;

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

  private async searchOpenFoodFactsByName(
    searchTerm: string,
    page: number,
    pageSize: number,
    host: 'es.openfoodfacts.org' | 'world.openfoodfacts.org' = 'es.openfoodfacts.org',
  ): Promise<MappedProduct[]> {
    const response = await lastValueFrom(
      this.httpService.get(
        `https://${host}/cgi/search.pl?` +
          `search_terms=${encodeURIComponent(searchTerm)}&` +
          `search_simple=1&` +
          `action=process&` +
          `json=1&` +
          `page=${page}&` +
          `page_size=${pageSize * 2}&` +
          `sort_by=unique_scans_n&` +
          `lc=es&` +
          `fields=product_name,product_name_es,brands,categories,nutrition_grades,nutriments,image_url,code`,
        {
          headers: {
            'User-Agent': 'GymTrackerApp/1.0',
          },
          timeout: this.OFF_TIMEOUT_MS,
        },
      ),
    );

    const allProducts = (response.data.products as OpenFoodFactsProduct[]) || [];
    return allProducts
      .filter((product: OpenFoodFactsProduct) => {
        const hasValidName = product.product_name_es || product.product_name;
        const hasValidCode = product.code && product.code.length > 0;
        return hasValidName && hasValidCode;
      })
      .map(
        (product: OpenFoodFactsProduct): MappedProduct => ({
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
          calories: Math.round(product.nutriments?.['energy-kcal_100g'] ?? 0),
          carbohydrates:
            Math.round((product.nutriments?.['carbohydrates_100g'] ?? 0) * 10) /
            10,
          protein:
            Math.round((product.nutriments?.['proteins_100g'] ?? 0) * 10) / 10,
          fat: Math.round((product.nutriments?.['fat_100g'] ?? 0) * 10) / 10,
          fiber: product.nutriments?.['fiber_100g']
            ? Math.round(product.nutriments['fiber_100g'] * 10) / 10
            : null,
          sugar: product.nutriments?.['sugars_100g']
            ? Math.round(product.nutriments['sugars_100g'] * 10) / 10
            : null,
          sodium: product.nutriments?.['sodium_100g']
            ? Math.round(product.nutriments['sodium_100g'] * 1000) / 10
            : null,
          others: [],
        }),
      );
  }

  async searchProductsByName(
    searchTerm: string,
    page: number = 1,
    pageSize: number = 20,
    includeOverlay: boolean = true,
    brandFilter?: string,
  ): Promise<{ products: MappedProduct[]; total: number }> {
    try {
      const normalizedSearch = this.normalizeSearchValue(searchTerm);
      if (!normalizedSearch) {
        return { products: [], total: 0 };
      }

      const parsedBrandFilters = this.parseBrandFilters(brandFilter);
      const normalizedBrandFilter = parsedBrandFilters.slice().sort().join('|');
      const cacheKey = `${normalizedSearch}:${page}:${pageSize}:${normalizedBrandFilter}`;
      const cached = this.searchCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }

      const searchVariants = this.buildSearchVariants(normalizedSearch);

      let localProducts: MappedProduct[] = [];
      for (const variant of searchVariants) {
        const localForVariant = await this.searchLocalCatalog(variant, page, pageSize);
        localProducts = this.mergeUniqueProducts([...localProducts, ...localForVariant]);
        if (localProducts.length >= pageSize) break;
      }
      localProducts = this.rankProducts(localProducts, searchVariants).slice(0, pageSize);

      if (localProducts.length >= pageSize) {
        const localResult = { products: localProducts, total: localProducts.length };
        this.searchCache.set(cacheKey, {
          expiresAt: Date.now() + this.SEARCH_CACHE_TTL_MS,
          value: localResult,
        });
        return localResult;
      }

      let offProducts: MappedProduct[] = [];
      for (const variant of searchVariants) {
        try {
          const esProducts = await this.searchOpenFoodFactsByName(
            variant,
            page,
            pageSize,
            'es.openfoodfacts.org',
          );
          offProducts = this.mergeUniqueProducts([...offProducts, ...esProducts]);
        } catch (error) {
          console.warn('OFF ES search failed:', error?.message || error);
        }
        if (offProducts.length >= pageSize) break;
      }

      if (offProducts.length < Math.min(6, pageSize)) {
        for (const variant of searchVariants) {
          try {
            const worldProducts = await this.searchOpenFoodFactsByName(
              variant,
              page,
              pageSize,
              'world.openfoodfacts.org',
            );
            offProducts = this.mergeUniqueProducts([
              ...offProducts,
              ...worldProducts,
            ]);
          } catch (error) {
            console.warn('OFF world search failed:', error?.message || error);
          }
          if (offProducts.length >= pageSize) break;
        }
      }

      offProducts = this.rankProducts(offProducts, searchVariants).slice(0, pageSize);

      void this.saveProductsToCatalog(offProducts, 'off', 'odbl').catch(
        error => {
          console.warn('Background save to catalog (OFF) failed:', error);
        },
      );

      let merged = this.mergeUniqueProducts([
        ...localProducts,
        ...offProducts,
      ]);

      if (merged.length < pageSize) {
        let usdaProducts: MappedProduct[] = [];
        for (const variant of searchVariants) {
          const partial = await this.searchUSDAProductsByName(
            variant,
            page,
            pageSize,
          );
          usdaProducts = this.mergeUniqueProducts([...usdaProducts, ...partial]);
          if (usdaProducts.length >= pageSize) break;
        }
        if (usdaProducts.length > 0) {
          void this.saveProductsToCatalog(usdaProducts, 'usda', 'cc0').catch(
            error => {
              console.warn('Background save to catalog (USDA) failed:', error);
            },
          );
          merged = this.mergeUniqueProducts([...merged, ...usdaProducts]);
        }
      }

      if (includeOverlay && merged.length < pageSize) {
        let overlayProducts: MappedProduct[] = [];
        for (const variant of searchVariants) {
          const partial = await this.searchOverlayProvidersByName(
            variant,
            page,
            pageSize,
          );
          overlayProducts = this.mergeUniqueProducts([
            ...overlayProducts,
            ...partial,
          ]);
          if (overlayProducts.length >= pageSize) break;
        }
        if (overlayProducts.length > 0) {
          merged = this.mergeUniqueProducts([...merged, ...overlayProducts]);
        }
      }

      merged = this.rankProducts(merged, searchVariants).slice(0, pageSize);
      const result = { products: merged, total: merged.length };
      if (parsedBrandFilters.length > 0) {
        result.products = result.products.filter(product =>
          this.matchesBrandFilters(product.brand, parsedBrandFilters),
        );
        result.total = result.products.length;
      }

      if (result.products.length > 0) {
        this.searchCache.set(cacheKey, {
          expiresAt: Date.now() + this.SEARCH_CACHE_TTL_MS,
          value: result,
        });
      }

      return result;
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
    brandFilter?: string,
  ): Promise<{ products: MappedProduct[]; total: number }> {
    const parsedBrandFilters = this.parseBrandFilters(brandFilter);
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

      const products = (response.data.products as OpenFoodFactsProduct[]) || [];
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
        .filter((product: OpenFoodFactsProduct) => {
          const hasValidName = product.product_name_es || product.product_name;
          const hasValidCode = product.code && product.code.length > 0;
          return hasValidName && hasValidCode;
        })
        .map(
          (product: OpenFoodFactsProduct): MappedProduct => ({
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
            calories: Math.round(product.nutriments?.['energy-kcal_100g'] ?? 0),
            carbohydrates:
              Math.round(
                (product.nutriments?.['carbohydrates_100g'] ?? 0) * 10,
              ) / 10,
            protein:
              Math.round((product.nutriments?.['proteins_100g'] ?? 0) * 10) /
              10,
            fat: Math.round((product.nutriments?.['fat_100g'] ?? 0) * 10) / 10,
            fiber: product.nutriments?.['fiber_100g']
              ? Math.round(product.nutriments['fiber_100g'] * 10) / 10
              : null,
            sugar: product.nutriments?.['sugars_100g']
              ? Math.round(product.nutriments['sugars_100g'] * 10) / 10
              : null,
            sodium: product.nutriments?.['sodium_100g']
              ? Math.round(product.nutriments['sodium_100g'] * 1000) / 10
              : null,
            // Keep list payload lightweight; full nutrient detail is fetched in product detail endpoint.
            others: [],
          }),
        )
        .sort((a: MappedProduct, b: MappedProduct) => {
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

      if (mappedProducts.length === 0) {
        const localRows = await this.dataSource.query(
          `
            SELECT
              p.barcode_gtin AS "code",
              p.canonical_name AS "name",
              p.canonical_brand AS "brand",
              p.image_url AS "image",
              p.serving_size AS "servingSize",
              n.calories AS "calories",
              n.protein AS "protein",
              n.carbs AS "carbohydrates",
              n.fat AS "fat",
              n.fiber AS "fiber",
              n.sugar AS "sugar",
              n.sodium AS "sodium"
            FROM nutrition_products_master p
            LEFT JOIN nutrition_product_nutrients_per_100g n
              ON n.product_id = p.id
            ORDER BY p.quality_score DESC, p.updated_at DESC
            LIMIT $1
            OFFSET $2
          `,
          [pageSize, Math.max(0, (page - 1) * pageSize)],
        );

        if (localRows.length > 0) {
          const localFallbackProducts = localRows.map((row: any) => ({
            code: row.code,
            name: row.name ?? 'Producto sin nombre',
            brand: row.brand ?? null,
            image: row.image ?? null,
            categories: null,
            nutritionGrade: null,
            servingSize: row.servingSize ?? null,
            grams: 100,
            calories: Number(row.calories ?? 0),
            protein: Number(row.protein ?? 0),
            carbohydrates: Number(row.carbohydrates ?? 0),
            fat: Number(row.fat ?? 0),
            fiber: row.fiber !== null ? Number(row.fiber) : null,
            sugar: row.sugar !== null ? Number(row.sugar) : null,
            sodium: row.sodium !== null ? Number(row.sodium) : null,
            others: [],
          }));

          const filteredLocalFallbackProducts = brandFilter?.trim()
            ? localFallbackProducts.filter(product =>
                this.matchesBrandFilters(product.brand, parsedBrandFilters),
              )
            : localFallbackProducts;

          return {
            products: filteredLocalFallbackProducts,
            total: filteredLocalFallbackProducts.length,
          };
        }

        // Last-resort quick seed on cold start to avoid empty first paint.
        const quickSeed = await this.searchProductsByName(
          'avena',
          1,
          pageSize,
          false,
          brandFilter,
        );
        if (quickSeed.products.length > 0) {
          return {
            products: quickSeed.products.slice(0, pageSize),
            total: quickSeed.products.length,
          };
        }
      }

      const filteredProducts = brandFilter?.trim()
        ? mappedProducts.filter(product =>
            this.matchesBrandFilters(product.brand, parsedBrandFilters),
          )
        : mappedProducts;

      void this.saveProductsToCatalog(filteredProducts, 'off', 'odbl').catch(
        error => {
          console.warn('Background save to catalog (OFF) failed:', error);
        },
      );

      return {
        products: filteredProducts,
        total: filteredProducts.length,
      };
    } catch (error) {
      console.error('Error obteniendo productos:', error);

      const localRows = await this.dataSource.query(
        `
          SELECT
            p.barcode_gtin AS "code",
            p.canonical_name AS "name",
            p.canonical_brand AS "brand",
            p.image_url AS "image",
            p.serving_size AS "servingSize",
            n.calories AS "calories",
            n.protein AS "protein",
            n.carbs AS "carbohydrates",
            n.fat AS "fat",
            n.fiber AS "fiber",
            n.sugar AS "sugar",
            n.sodium AS "sodium"
          FROM nutrition_products_master p
          LEFT JOIN nutrition_product_nutrients_per_100g n
            ON n.product_id = p.id
          ORDER BY p.quality_score DESC, p.updated_at DESC
          LIMIT $1
          OFFSET $2
        `,
        [pageSize, Math.max(0, (page - 1) * pageSize)],
      );

      const localProducts = localRows.map((row: any) => ({
          code: row.code,
          name: row.name ?? 'Producto sin nombre',
          brand: row.brand ?? null,
          image: row.image ?? null,
          categories: null,
          nutritionGrade: null,
          servingSize: row.servingSize ?? null,
          grams: 100,
          calories: Number(row.calories ?? 0),
          protein: Number(row.protein ?? 0),
          carbohydrates: Number(row.carbohydrates ?? 0),
          fat: Number(row.fat ?? 0),
          fiber: row.fiber !== null ? Number(row.fiber) : null,
          sugar: row.sugar !== null ? Number(row.sugar) : null,
          sodium: row.sodium !== null ? Number(row.sodium) : null,
          others: [],
        }));

      const filteredLocalProducts = brandFilter?.trim()
        ? localProducts.filter(product =>
            this.matchesBrandFilters(product.brand, parsedBrandFilters),
          )
        : localProducts;

      return {
        products: filteredLocalProducts,
        total: filteredLocalProducts.length,
      };

    }
  }

  async getProductDetail(code: string): Promise<MappedProduct> {
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
      const product = response.data.product as OpenFoodFactsProduct;

      if (!product) {
        throw new NotFoundException(
          `Producto con código ${code} no encontrado`,
        );
      }

      const mappedProduct: MappedProduct = {
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
            value: value as string | number,
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
