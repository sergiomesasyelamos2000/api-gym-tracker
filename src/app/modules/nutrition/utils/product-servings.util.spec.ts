import { attachServingsToProduct } from './product-servings.util';

describe('attachServingsToProduct', () => {
  it('attaches package + gram servings from OFF serving size', () => {
    const product = attachServingsToProduct({
      code: '123',
      name: 'Test',
      brand: null,
      image: null,
      categories: null,
      nutritionGrade: null,
      servingSize: '30 g',
      grams: 100,
      calories: 100,
      carbohydrates: 10,
      protein: 5,
      fat: 2,
      fiber: null,
      sugar: null,
      sodium: null,
      others: [],
    });

    expect(product.servings?.some(s => s.id === 'package')).toBe(true);
    expect(product.servings?.some(s => s.id === 'gram')).toBe(true);
  });

  it('attaches USDA household portions', () => {
    const product = attachServingsToProduct(
      {
        code: 'usda-1',
        name: 'Bananas, raw',
        brand: null,
        image: null,
        categories: null,
        nutritionGrade: null,
        grams: 100,
        calories: 89,
        carbohydrates: 22.84,
        protein: 1.09,
        fat: 0.33,
        fiber: null,
        sugar: null,
        sodium: null,
        others: [],
        fdcId: 173944,
      },
      [
        {
          id: 1,
          gramWeight: 118,
          modifier: 'medium (7" to 7-7/8" long)',
          sequenceNumber: 1,
        },
      ],
    );

    expect(product.servings?.some(s => s.kind === 'household')).toBe(true);
    expect(product.servings?.find(s => s.kind === 'household')?.grams).toBe(
      118,
    );
  });
});
