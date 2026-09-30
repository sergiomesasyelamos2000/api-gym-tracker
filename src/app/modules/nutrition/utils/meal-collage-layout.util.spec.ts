import {
  collectMealProductImageUrls,
  computeMealCollageLayout,
  inferLegacyMealImageSource,
  MEAL_COLLAGE_CANVAS,
} from './meal-collage-layout.util';

describe('collectMealProductImageUrls', () => {
  it('keeps product order and skips empties', () => {
    expect(
      collectMealProductImageUrls([
        { productImage: 'https://a/1.jpg' },
        { productImage: null },
        { productImage: 'https://a/2.jpg' },
        { productImage: '  ' },
      ]),
    ).toEqual(['https://a/1.jpg', 'https://a/2.jpg']);
  });

  it('dedupes by exact URL keeping first occurrence', () => {
    expect(
      collectMealProductImageUrls([
        { productImage: 'https://a/1.jpg' },
        { productImage: 'https://a/1.jpg' },
        { productImage: 'https://a/2.jpg' },
      ]),
    ).toEqual(['https://a/1.jpg', 'https://a/2.jpg']);
  });
});

describe('computeMealCollageLayout', () => {
  it('returns empty for zero', () => {
    expect(computeMealCollageLayout(0)).toEqual([]);
  });

  it('fills canvas for one image', () => {
    expect(computeMealCollageLayout(1)).toEqual([
      { x: 0, y: 0, width: MEAL_COLLAGE_CANVAS, height: MEAL_COLLAGE_CANVAS, index: 0 },
    ]);
  });

  it('splits vertically for two images', () => {
    const cells = computeMealCollageLayout(2);
    expect(cells).toHaveLength(2);
    expect(cells[0]).toMatchObject({ x: 0, y: 0, width: 400, height: 800 });
    expect(cells[1]).toMatchObject({ x: 400, y: 0, width: 400, height: 800 });
  });

  it('uses large-left layout for three images', () => {
    const cells = computeMealCollageLayout(3);
    expect(cells).toHaveLength(3);
    expect(cells[0]).toMatchObject({ x: 0, width: 400, height: 800 });
    expect(cells[1]).toMatchObject({ x: 400, y: 0, width: 400, height: 400 });
    expect(cells[2]).toMatchObject({ x: 400, y: 400, width: 400, height: 400 });
  });

  it('uses 2x2 for four images', () => {
    const cells = computeMealCollageLayout(4);
    expect(cells).toHaveLength(4);
    expect(cells.map(c => [c.x, c.y])).toEqual([
      [0, 0],
      [400, 0],
      [0, 400],
      [400, 400],
    ]);
  });

  it('uses sqrt grid for nine images', () => {
    const cells = computeMealCollageLayout(9);
    expect(cells).toHaveLength(9);
    expect(cells[0]).toMatchObject({ x: 0, y: 0, width: 800 / 3, height: 800 / 3 });
    expect(cells[8]).toMatchObject({
      x: (800 / 3) * 2,
      y: (800 / 3) * 2,
    });
  });
});

describe('inferLegacyMealImageSource', () => {
  it('treats missing image as collage-eligible', () => {
    expect(inferLegacyMealImageSource({ image: null, products: [] })).toBe(
      'collage',
    );
  });

  it('treats first-product cover as collage', () => {
    expect(
      inferLegacyMealImageSource({
        image: 'https://cdn/p1.jpg',
        products: [{ productImage: 'https://cdn/p1.jpg' }],
      }),
    ).toBe('collage');
  });

  it('treats other covers as user', () => {
    expect(
      inferLegacyMealImageSource({
        image: 'https://cdn/meal.jpg',
        products: [{ productImage: 'https://cdn/p1.jpg' }],
      }),
    ).toBe('user');
  });
});
