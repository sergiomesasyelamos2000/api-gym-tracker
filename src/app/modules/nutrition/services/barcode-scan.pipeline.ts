import { MappedProduct } from '@app/entity-data-models';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { normalizeGtin } from '../utils/gtin.util';
import { mapCustomProductToMappedProduct } from '../utils/off-product.mapper';

export type BarcodeLookupSource = 'custom' | 'local' | 'off' | 'usda';

export type BarcodeLookupDeps = {
  findCustomByVariants: (
    userId: string,
    variants: string[],
  ) => Promise<{
    id: string;
    name: string;
    brand?: string | null;
    image?: string | null;
    caloriesPer100: number;
    proteinPer100: number;
    carbsPer100: number;
    fatPer100: number;
    fiberPer100?: number | null;
    sugarPer100?: number | null;
    sodiumPer100?: number | null;
    servingSize?: number | null;
    servingUnit?: string | null;
  } | null>;
  findCatalogByVariants: (variants: string[]) => Promise<MappedProduct | null>;
  fetchOpenFoodFacts: (
    code: string,
    productTypeAll: boolean,
  ) => Promise<MappedProduct | null>;
  fetchUsdaExactGtin: (variants: string[]) => Promise<MappedProduct | null>;
  /** Thrown when OFF transport fails (timeout / 5xx). Must not be swallowed. */
  isCatalogUnavailableError?: (error: unknown) => boolean;
};

export async function lookupBarcode(
  deps: BarcodeLookupDeps,
  rawCode: string,
  userId?: string,
): Promise<{ product: MappedProduct; source: BarcodeLookupSource }> {
  const normalized = normalizeGtin(rawCode);
  if (!normalized.ok) {
    throw new BadRequestException(
      `Código de barras no válido (${normalized.reason})`,
    );
  }

  const { canonical, variants } = normalized;

  if (userId) {
    const custom = await deps.findCustomByVariants(userId, variants);
    if (custom) {
      return {
        product: mapCustomProductToMappedProduct(custom),
        source: 'custom',
      };
    }
  }

  const local = await deps.findCatalogByVariants(variants);
  if (local) {
    return { product: local, source: 'local' };
  }

  let offProduct: MappedProduct | null = null;
  try {
    offProduct = await deps.fetchOpenFoodFacts(canonical, false);
    if (!offProduct) {
      offProduct = await deps.fetchOpenFoodFacts(canonical, true);
    }
  } catch (error) {
    if (deps.isCatalogUnavailableError?.(error)) {
      throw error instanceof ServiceUnavailableException
        ? error
        : new ServiceUnavailableException(
            'No se pudo consultar el catálogo de productos.',
          );
    }
    throw new ServiceUnavailableException(
      'No se pudo consultar el catálogo de productos.',
    );
  }

  if (offProduct) {
    return { product: offProduct, source: 'off' };
  }

  const usda = await deps.fetchUsdaExactGtin(variants);
  if (usda) {
    return { product: usda, source: 'usda' };
  }

  throw new NotFoundException(
    `No se encontró un producto para el código ${canonical}`,
  );
}
