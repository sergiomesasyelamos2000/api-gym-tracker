import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { lookupBarcode, BarcodeLookupDeps } from './barcode-scan.pipeline';

const PROZIS_EAN = '5600380893930';

function createDeps(
  overrides: Partial<BarcodeLookupDeps> = {},
): BarcodeLookupDeps {
  return {
    findCustomByVariants: jest.fn().mockResolvedValue(null),
    findCatalogByVariants: jest.fn().mockResolvedValue(null),
    fetchOpenFoodFacts: jest.fn().mockResolvedValue(null),
    fetchUsdaExactGtin: jest.fn().mockResolvedValue(null),
    isCatalogUnavailableError: error =>
      error instanceof ServiceUnavailableException,
    ...overrides,
  };
}

const sampleMapped = {
  code: PROZIS_EAN,
  name: 'Creatine Monohydrate',
  brand: 'Prozis',
  image: null,
  categories: null,
  nutritionGrade: null,
  grams: 100,
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
  fiber: null,
  sugar: null,
  sodium: null,
  others: [],
};

describe('lookupBarcode', () => {
  it('returns custom product without calling HTTP', async () => {
    const deps = createDeps({
      findCustomByVariants: jest.fn().mockResolvedValue({
        id: 'custom-1',
        name: 'Mi whey',
        brand: 'Prozis',
        caloriesPer100: 370,
        proteinPer100: 80,
        carbsPer100: 5,
        fatPer100: 3,
      }),
    });

    const result = await lookupBarcode(deps, PROZIS_EAN, 'user-1');

    expect(result.source).toBe('custom');
    expect(result.product.code).toBe('custom-1');
    expect(deps.fetchOpenFoodFacts).not.toHaveBeenCalled();
    expect(deps.findCatalogByVariants).not.toHaveBeenCalled();
  });

  it('skips custom lookup when userId is absent', async () => {
    const deps = createDeps({
      findCatalogByVariants: jest.fn().mockResolvedValue(sampleMapped),
    });

    await lookupBarcode(deps, PROZIS_EAN);

    expect(deps.findCustomByVariants).not.toHaveBeenCalled();
    expect(deps.findCatalogByVariants).toHaveBeenCalled();
  });

  it('returns local catalog hit and skips OFF', async () => {
    const deps = createDeps({
      findCatalogByVariants: jest.fn().mockResolvedValue(sampleMapped),
    });

    const result = await lookupBarcode(deps, PROZIS_EAN, 'user-1');

    expect(result.source).toBe('local');
    expect(deps.fetchOpenFoodFacts).not.toHaveBeenCalled();
  });

  it('fetches OFF world product then stops', async () => {
    const fetchOpenFoodFacts = jest
      .fn()
      .mockResolvedValueOnce(sampleMapped);
    const deps = createDeps({ fetchOpenFoodFacts });

    const result = await lookupBarcode(deps, PROZIS_EAN, 'user-1');

    expect(result.source).toBe('off');
    expect(fetchOpenFoodFacts).toHaveBeenCalledWith(PROZIS_EAN, false);
    expect(fetchOpenFoodFacts).toHaveBeenCalledTimes(1);
    expect(deps.fetchUsdaExactGtin).not.toHaveBeenCalled();
  });

  it('tries product_type=all then USDA on clean OFF miss', async () => {
    const fetchOpenFoodFacts = jest.fn().mockResolvedValue(null);
    const fetchUsdaExactGtin = jest.fn().mockResolvedValue({
      ...sampleMapped,
      code: PROZIS_EAN,
      name: 'USDA hit',
    });
    const deps = createDeps({ fetchOpenFoodFacts, fetchUsdaExactGtin });

    const result = await lookupBarcode(deps, PROZIS_EAN, 'user-1');

    expect(result.source).toBe('usda');
    expect(fetchOpenFoodFacts).toHaveBeenNthCalledWith(1, PROZIS_EAN, false);
    expect(fetchOpenFoodFacts).toHaveBeenNthCalledWith(2, PROZIS_EAN, true);
    expect(fetchUsdaExactGtin).toHaveBeenCalled();
  });

  it('throws NotFoundException when every source misses', async () => {
    const deps = createDeps();
    await expect(lookupBarcode(deps, PROZIS_EAN, 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws ServiceUnavailableException on OFF timeout and skips USDA', async () => {
    const deps = createDeps({
      fetchOpenFoodFacts: jest
        .fn()
        .mockRejectedValue(
          new ServiceUnavailableException(
            'No se pudo consultar el catálogo de productos.',
          ),
        ),
    });

    await expect(lookupBarcode(deps, PROZIS_EAN, 'user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(deps.fetchUsdaExactGtin).not.toHaveBeenCalled();
  });

  it('throws BadRequestException for URL payloads', async () => {
    const deps = createDeps();
    await expect(
      lookupBarcode(deps, 'https://prozis.com/p/123', 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(deps.findCustomByVariants).not.toHaveBeenCalled();
  });
});
