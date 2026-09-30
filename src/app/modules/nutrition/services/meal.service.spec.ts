import { CustomMealEntity } from '@app/entity-data-models';
import { MealService } from './meal.service';
import { MealCollageService } from './meal-collage.service';

describe('MealService image resolution', () => {
  const collageBuffer = Buffer.from('png');
  let mealService: MealService;
  let mealCollageService: {
    buildCollageFromUrls: jest.Mock;
  };
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(() => {
    mealCollageService = {
      buildCollageFromUrls: jest.fn().mockResolvedValue(collageBuffer),
    };
    repo = {
      create: jest.fn(input => input),
      save: jest.fn(async meal => ({
        ...meal,
        id: meal.id || 'meal-1',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      })),
      findOne: jest.fn(),
    };

    mealService = new MealService(
      repo as never,
      mealCollageService as never,
    );

    const serviceAny = mealService as unknown as {
      uploadToCloudinary: (
        base64Image: string,
        folder: string,
      ) => Promise<string>;
      uploadBufferToCloudinary: (
        buffer: Buffer,
        folder: string,
      ) => Promise<string>;
      deleteFromCloudinary: (publicId: string) => Promise<void>;
    };

    serviceAny.uploadToCloudinary = jest
      .fn()
      .mockResolvedValue(
        'https://res.cloudinary.com/demo/nutrition/meals/user.jpg',
      );
    serviceAny.uploadBufferToCloudinary = jest
      .fn()
      .mockResolvedValue(
        'https://res.cloudinary.com/demo/nutrition/meals/collage.png',
      );
    serviceAny.deleteFromCloudinary = jest.fn().mockResolvedValue(undefined);
  });

  it('creates a collage when imageKind is auto', async () => {
    const result = await mealService.createCustomMeal({
      userId: 'u1',
      name: 'Bowl',
      imageKind: 'auto',
      products: [
        {
          productCode: 'p1',
          productName: 'Avena',
          quantity: 100,
          unit: 'g',
          calories: 100,
          protein: 10,
          carbs: 20,
          fat: 5,
          productImage: 'https://cdn/p1.jpg',
        },
        {
          productCode: 'p2',
          productName: 'Leche',
          quantity: 100,
          unit: 'ml',
          calories: 50,
          protein: 3,
          carbs: 5,
          fat: 2,
          productImage: 'https://cdn/p2.jpg',
        },
      ],
    });

    expect(mealCollageService.buildCollageFromUrls).toHaveBeenCalledWith([
      'https://cdn/p1.jpg',
      'https://cdn/p2.jpg',
    ]);
    expect(result.image).toContain('collage.png');
    expect(result.imageSource).toBe('collage');
  });

  it('uploads user photo and skips collage when imageKind is user', async () => {
    const result = await mealService.createCustomMeal({
      userId: 'u1',
      name: 'Bowl',
      imageKind: 'user',
      image: 'data:image/jpeg;base64,abc',
      products: [
        {
          productCode: 'p1',
          productName: 'Avena',
          quantity: 100,
          unit: 'g',
          calories: 100,
          protein: 10,
          carbs: 20,
          fat: 5,
          productImage: 'https://cdn/p1.jpg',
        },
      ],
    });

    expect(mealCollageService.buildCollageFromUrls).not.toHaveBeenCalled();
    expect(result.imageSource).toBe('user');
  });

  it('regenerates collage on product change when cover is collage', async () => {
    const existing = {
      id: 'meal-1',
      userId: 'u1',
      name: 'Bowl',
      image: 'https://res.cloudinary.com/demo/nutrition/meals/old.png',
      imageSource: 'collage',
      products: [
        {
          productCode: 'p1',
          productName: 'Avena',
          quantity: 100,
          unit: 'g',
          calories: 100,
          protein: 10,
          carbs: 20,
          fat: 5,
          productImage: 'https://cdn/p1.jpg',
        },
      ],
      totalCalories: 100,
      totalProtein: 10,
      totalCarbs: 20,
      totalFat: 5,
    } as CustomMealEntity;

    repo.findOne.mockResolvedValue(existing);

    const result = await mealService.updateCustomMeal(
      'meal-1',
      {
        imageKind: 'auto',
        products: [
          {
            productCode: 'p1',
            productName: 'Avena',
            quantity: 100,
            unit: 'g',
            calories: 100,
            protein: 10,
            carbs: 20,
            fat: 5,
            productImage: 'https://cdn/p1.jpg',
          },
          {
            productCode: 'p2',
            productName: 'Leche',
            quantity: 100,
            unit: 'ml',
            calories: 50,
            protein: 3,
            carbs: 5,
            fat: 2,
            productImage: 'https://cdn/p2.jpg',
          },
        ],
      },
      'u1',
    );

    expect(mealCollageService.buildCollageFromUrls).toHaveBeenCalled();
    expect(result.imageSource).toBe('collage');
  });

  it('keeps user photo when products change', async () => {
    const existing = {
      id: 'meal-1',
      userId: 'u1',
      name: 'Bowl',
      image: 'https://res.cloudinary.com/demo/nutrition/meals/user.jpg',
      imageSource: 'user',
      products: [
        {
          productCode: 'p1',
          productName: 'Avena',
          quantity: 100,
          unit: 'g',
          calories: 100,
          protein: 10,
          carbs: 20,
          fat: 5,
          productImage: 'https://cdn/p1.jpg',
        },
      ],
      totalCalories: 100,
      totalProtein: 10,
      totalCarbs: 20,
      totalFat: 5,
    } as CustomMealEntity;

    repo.findOne.mockResolvedValue(existing);

    const result = await mealService.updateCustomMeal(
      'meal-1',
      {
        imageKind: 'user',
        products: [
          {
            productCode: 'p1',
            productName: 'Avena',
            quantity: 100,
            unit: 'g',
            calories: 100,
            protein: 10,
            carbs: 20,
            fat: 5,
            productImage: 'https://cdn/p1.jpg',
          },
          {
            productCode: 'p2',
            productName: 'Leche',
            quantity: 100,
            unit: 'ml',
            calories: 50,
            protein: 3,
            carbs: 5,
            fat: 2,
            productImage: 'https://cdn/p2.jpg',
          },
        ],
      },
      'u1',
    );

    expect(mealCollageService.buildCollageFromUrls).not.toHaveBeenCalled();
    expect(result.image).toBe(existing.image);
    expect(result.imageSource).toBe('user');
  });

  it('rebuilds collage when user clears photo with image null', async () => {
    const existing = {
      id: 'meal-1',
      userId: 'u1',
      name: 'Bowl',
      image: 'https://res.cloudinary.com/demo/nutrition/meals/user.jpg',
      imageSource: 'user',
      products: [
        {
          productCode: 'p1',
          productName: 'Avena',
          quantity: 100,
          unit: 'g',
          calories: 100,
          protein: 10,
          carbs: 20,
          fat: 5,
          productImage: 'https://cdn/p1.jpg',
        },
      ],
      totalCalories: 100,
      totalProtein: 10,
      totalCarbs: 20,
      totalFat: 5,
    } as CustomMealEntity;

    repo.findOne.mockResolvedValue(existing);

    const result = await mealService.updateCustomMeal(
      'meal-1',
      {
        imageKind: 'auto',
        image: null,
        products: existing.products,
      },
      'u1',
    );

    expect(mealCollageService.buildCollageFromUrls).toHaveBeenCalled();
    expect(result.imageSource).toBe('collage');
  });

  it('keeps existing collage when rebuild fails', async () => {
    mealCollageService.buildCollageFromUrls.mockResolvedValueOnce(null);

    const existing = {
      id: 'meal-1',
      userId: 'u1',
      name: 'Bowl',
      image: 'https://res.cloudinary.com/demo/nutrition/meals/old.png',
      imageSource: 'collage',
      products: [
        {
          productCode: 'p1',
          productName: 'Avena',
          quantity: 100,
          unit: 'g',
          calories: 100,
          protein: 10,
          carbs: 20,
          fat: 5,
          productImage: 'https://cdn/p1.jpg',
        },
      ],
      totalCalories: 100,
      totalProtein: 10,
      totalCarbs: 20,
      totalFat: 5,
    } as CustomMealEntity;

    repo.findOne.mockResolvedValue(existing);

    const result = await mealService.updateCustomMeal(
      'meal-1',
      {
        imageKind: 'auto',
        products: [
          {
            productCode: 'p1',
            productName: 'Avena',
            quantity: 100,
            unit: 'g',
            calories: 100,
            protein: 10,
            carbs: 20,
            fat: 5,
            productImage: 'https://cdn/p1.jpg',
          },
          {
            productCode: 'p2',
            productName: 'Leche',
            quantity: 100,
            unit: 'ml',
            calories: 50,
            protein: 3,
            carbs: 5,
            fat: 2,
            productImage: 'https://cdn/p2.jpg',
          },
        ],
      },
      'u1',
    );

    expect(result.image).toBe(existing.image);
    expect(result.imageSource).toBe('collage');
  });

  it('does not rebuild collage when product images are unchanged', async () => {
    const existing = {
      id: 'meal-1',
      userId: 'u1',
      name: 'Bowl',
      image: 'https://res.cloudinary.com/demo/nutrition/meals/old.png',
      imageSource: 'collage',
      products: [
        {
          productCode: 'p1',
          productName: 'Avena',
          quantity: 100,
          unit: 'g',
          calories: 100,
          protein: 10,
          carbs: 20,
          fat: 5,
          productImage: 'https://cdn/p1.jpg',
        },
      ],
      totalCalories: 100,
      totalProtein: 10,
      totalCarbs: 20,
      totalFat: 5,
    } as CustomMealEntity;

    repo.findOne.mockResolvedValue(existing);

    const result = await mealService.updateCustomMeal(
      'meal-1',
      {
        imageKind: 'auto',
        name: 'Bowl Updated',
        products: [
          {
            productCode: 'p1',
            productName: 'Avena',
            quantity: 150,
            unit: 'g',
            calories: 150,
            protein: 15,
            carbs: 30,
            fat: 7,
            productImage: 'https://cdn/p1.jpg',
          },
        ],
      },
      'u1',
    );

    expect(mealCollageService.buildCollageFromUrls).not.toHaveBeenCalled();
    expect(result.image).toBe(existing.image);
    expect(result.name).toBe('Bowl Updated');
  });
});
