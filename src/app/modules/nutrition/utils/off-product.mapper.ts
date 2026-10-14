import { MappedProduct, OpenFoodFactsProduct } from '@app/entity-data-models';
import NUTRIENT_LABELS_ES from '../../../utils/nutrients-labels';

/**
 * Detailed Open Food Facts → MappedProduct mapping used by barcode scan
 * and product detail (includes serving size, saturated fat, others).
 */
export function mapOpenFoodFactsProductDetailed(
  product: OpenFoodFactsProduct,
): MappedProduct {
  return {
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
        (product.nutriments?.['fat_100g'] ?? product.nutriments?.['fat'] ?? 0) *
          10,
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
}

export function mapCustomProductToMappedProduct(product: {
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
}): MappedProduct {
  return {
    code: product.id,
    name: product.name,
    brand: product.brand ?? null,
    image: product.image ?? null,
    categories: null,
    nutritionGrade: null,
    servingSize: product.servingSize
      ? `${product.servingSize} ${product.servingUnit || 'g'}`
      : null,
    grams: 100,
    calories: product.caloriesPer100,
    protein: product.proteinPer100,
    carbohydrates: product.carbsPer100,
    fat: product.fatPer100,
    fiber: product.fiberPer100 ?? null,
    sugar: product.sugarPer100 ?? null,
    sodium: product.sodiumPer100 ?? null,
    others: [
      ...(product.fiberPer100
        ? [{ label: 'Fibra', value: product.fiberPer100 }]
        : []),
      ...(product.sugarPer100
        ? [{ label: 'Azúcar', value: product.sugarPer100 }]
        : []),
      ...(product.sodiumPer100
        ? [{ label: 'Sodio', value: product.sodiumPer100 }]
        : []),
    ],
  };
}
