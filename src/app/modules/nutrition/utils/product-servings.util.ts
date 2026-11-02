import { MappedProduct, ProductServingMeasure } from '@app/entity-data-models';
import {
  assembleProductServings,
  mapUsdaFoodPortions,
  type UsdaFoodPortionInput,
} from '@sergiomesasyelamos2000/shared';

export function attachServingsToProduct(
  product: MappedProduct,
  usdaPortions?: UsdaFoodPortionInput[] | null,
): MappedProduct {
  const servings: ProductServingMeasure[] = assembleProductServings({
    servingSize: product.servingSize,
    categories: product.categories,
    usdaPortions,
  });

  return {
    ...product,
    servings,
  };
}

export function mapUsdaPortionsToMeasures(
  portions?: UsdaFoodPortionInput[] | null,
): ProductServingMeasure[] {
  return mapUsdaFoodPortions(portions);
}
