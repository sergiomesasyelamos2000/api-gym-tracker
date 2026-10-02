import { DiaryService } from './diary.service';

describe('DiaryService range summaries', () => {
  const foodEntryRepo = {
    find: jest.fn(),
  };
  const userProfileRepo = {
    findOne: jest.fn(),
  };

  let service: DiaryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DiaryService(
      foodEntryRepo as any,
      userProfileRepo as any,
    );
  });

  it('getWeeklySummary uses one range query and one profile fetch', async () => {
    foodEntryRepo.find.mockResolvedValue([
      {
        id: 'e1',
        userId: 'u1',
        productCode: 'p1',
        productName: 'Rice',
        date: '2026-03-02',
        mealType: 'lunch',
        quantity: 100,
        unit: 'gram',
        calories: 130,
        protein: 3,
        carbs: 28,
        fat: 0,
        createdAt: new Date('2026-03-02T12:00:00.000Z'),
      },
    ]);
    userProfileRepo.findOne.mockResolvedValue({
      userId: 'u1',
      dailyCalories: 2200,
      proteinGrams: 160,
      carbsGrams: 220,
      fatGrams: 70,
    });

    const summaries = await service.getWeeklySummary('u1', '2026-03-01');

    expect(foodEntryRepo.find).toHaveBeenCalledTimes(1);
    expect(userProfileRepo.findOne).toHaveBeenCalledTimes(1);
    expect(summaries).toHaveLength(7);
    expect(summaries[0].date).toBe('2026-03-01');
    expect(summaries[0].entries).toHaveLength(0);
    expect(summaries[1].date).toBe('2026-03-02');
    expect(summaries[1].entries).toHaveLength(1);
    expect(summaries[1].totals.calories).toBe(130);
    expect(summaries[1].goals.dailyCalories).toBe(2200);
    expect(summaries[1].hasProfile).toBe(true);
  });

  it('getMonthlySummary fills every day of the month with two DB calls', async () => {
    foodEntryRepo.find.mockResolvedValue([]);
    userProfileRepo.findOne.mockResolvedValue(null);

    const summaries = await service.getMonthlySummary('u1', 2026, 2);

    expect(foodEntryRepo.find).toHaveBeenCalledTimes(1);
    expect(userProfileRepo.findOne).toHaveBeenCalledTimes(1);
    expect(summaries).toHaveLength(28);
    expect(summaries[0].hasProfile).toBe(false);
    expect(summaries[0].goals.dailyCalories).toBe(2000);
  });
});
