import {
  CreateUserNutritionProfileDto,
  UpdateMacroGoalsDto,
  UpdateUserNutritionProfileDto,
  UserNutritionProfileEntity,
  UserNutritionProfileResponseDto,
  WeightUnit,
} from '@app/entity-data-models';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserNutritionProfileEntity)
    private readonly userProfileRepo: Repository<UserNutritionProfileEntity>,
  ) {}

  async getUserProfile(
    userId: string,
  ): Promise<UserNutritionProfileResponseDto> {
    const profile = await this.userProfileRepo.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        `Perfil de usuario no encontrado para userId: ${userId}`,
      );
    }

    return this.mapProfileToDto(profile);
  }

  async createUserProfile(
    dto: CreateUserNutritionProfileDto,
  ): Promise<UserNutritionProfileResponseDto> {
    const existing = await this.userProfileRepo.findOne({
      where: { userId: dto.userId },
    });

    if (existing) {
      throw new BadRequestException(
        `El perfil de usuario ya existe para userId: ${dto.userId}`,
      );
    }

    const profile = this.userProfileRepo.create({
      userId: dto.userId,
      weight: dto.anthropometrics.weight,
      height: dto.anthropometrics.height,
      age: dto.anthropometrics.age,
      gender: dto.anthropometrics.gender,
      activityLevel: dto.anthropometrics.activityLevel,
      weightGoal: dto.goals.weightGoal,
      targetWeight: dto.goals.targetWeight,
      weeklyWeightChange: dto.goals.weeklyWeightChange,
      dailyCalories: dto.macroGoals.dailyCalories,
      proteinGrams: dto.macroGoals.protein,
      carbsGrams: dto.macroGoals.carbs,
      fatGrams: dto.macroGoals.fat,
      weightUnit: dto.preferences.weightUnit,
      heightUnit: dto.preferences.heightUnit,
    });

    const hasDefaultMacros =
      dto.macroGoals.dailyCalories === 2000 &&
      dto.macroGoals.protein === 150 &&
      dto.macroGoals.carbs === 200 &&
      dto.macroGoals.fat === 65;

    if (hasDefaultMacros) {
      const calculatedMacros = this.recalculateAllMacros(profile);
      profile.dailyCalories = calculatedMacros.dailyCalories;
      profile.proteinGrams = calculatedMacros.protein;
      profile.carbsGrams = calculatedMacros.carbs;
      profile.fatGrams = calculatedMacros.fat;
    }

    const saved = await this.userProfileRepo.save(profile);
    return this.mapProfileToDto(saved);
  }

  async updateUserProfile(
    userId: string,
    dto: UpdateUserNutritionProfileDto,
  ): Promise<UserNutritionProfileResponseDto> {
    const profile = await this.userProfileRepo.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        `Perfil no encontrado para userId: ${userId}`,
      );
    }

    let shouldRecalculateMacros = false;

    if (dto.anthropometrics) {
      if (dto.anthropometrics.weight !== undefined) {
        profile.weight = dto.anthropometrics.weight;
        shouldRecalculateMacros = true;
      }
      if (dto.anthropometrics.height !== undefined) {
        profile.height = dto.anthropometrics.height;
        shouldRecalculateMacros = true;
      }
      if (dto.anthropometrics.age !== undefined) {
        profile.age = dto.anthropometrics.age;
        shouldRecalculateMacros = true;
      }
      if (dto.anthropometrics.gender !== undefined) {
        profile.gender = dto.anthropometrics.gender;
        shouldRecalculateMacros = true;
      }
      if (dto.anthropometrics.activityLevel !== undefined) {
        profile.activityLevel = dto.anthropometrics.activityLevel;
        shouldRecalculateMacros = true;
      }
    }

    if (dto.goals) {
      if (dto.goals.weightGoal !== undefined) {
        profile.weightGoal = dto.goals.weightGoal;
        shouldRecalculateMacros = true;
      }
      if (dto.goals.targetWeight !== undefined) {
        profile.targetWeight = dto.goals.targetWeight;
      }
      if (dto.goals.weeklyWeightChange !== undefined) {
        profile.weeklyWeightChange = dto.goals.weeklyWeightChange;
        shouldRecalculateMacros = true;
      }
    }

    if (dto.macroGoals) {
      if (dto.macroGoals.dailyCalories !== undefined)
        profile.dailyCalories = dto.macroGoals.dailyCalories;
      if (dto.macroGoals.protein !== undefined)
        profile.proteinGrams = dto.macroGoals.protein;
      if (dto.macroGoals.carbs !== undefined)
        profile.carbsGrams = dto.macroGoals.carbs;
      if (dto.macroGoals.fat !== undefined)
        profile.fatGrams = dto.macroGoals.fat;
      shouldRecalculateMacros = false;
    }

    if (dto.preferences) {
      if (dto.preferences.weightUnit !== undefined)
        profile.weightUnit = dto.preferences.weightUnit;
      if (dto.preferences.heightUnit !== undefined)
        profile.heightUnit = dto.preferences.heightUnit;
    }

    if (shouldRecalculateMacros) {
      const calculatedMacros = this.recalculateAllMacros(profile);
      profile.dailyCalories = calculatedMacros.dailyCalories;
      profile.proteinGrams = calculatedMacros.protein;
      profile.carbsGrams = calculatedMacros.carbs;
      profile.fatGrams = calculatedMacros.fat;
    }

    const updated = await this.userProfileRepo.save(profile);
    return this.mapProfileToDto(updated);
  }

  async updateMacroGoals(
    userId: string,
    dto: UpdateMacroGoalsDto,
  ): Promise<UserNutritionProfileResponseDto> {
    const profile = await this.userProfileRepo.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        `Perfil no encontrado para userId: ${userId}`,
      );
    }

    profile.dailyCalories = dto.dailyCalories;
    profile.proteinGrams = dto.protein;
    profile.carbsGrams = dto.carbs;
    profile.fatGrams = dto.fat;

    const updated = await this.userProfileRepo.save(profile);
    return this.mapProfileToDto(updated);
  }

  private calculateBMR(
    weight: number,
    height: number,
    age: number,
    gender: string,
  ): number {
    const baseBMR = 10 * weight + 6.25 * height - 5 * age;

    switch (gender.toLowerCase()) {
      case 'male':
        return baseBMR + 5;
      case 'female':
        return baseBMR - 161;
      default:
        return baseBMR - 78;
    }
  }

  private calculateTDEE(bmr: number, activityLevel: string): number {
    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extra_active: 1.9,
    };

    const multiplier = activityMultipliers[activityLevel] || 1.55;
    return bmr * multiplier;
  }

  private calculateDailyCalories(
    tdee: number,
    weightGoal: string,
    weeklyWeightChange: number,
  ): number {
    const weeklyCalorieChange = weeklyWeightChange * 7700;
    const dailyCalorieChange = weeklyCalorieChange / 7;

    switch (weightGoal.toLowerCase()) {
      case 'lose':
        return Math.round(tdee - Math.abs(dailyCalorieChange));
      case 'gain':
        return Math.round(tdee + Math.abs(dailyCalorieChange));
      default:
        return Math.round(tdee);
    }
  }

  private calculateMacros(
    dailyCalories: number,
    weight: number,
    weightGoal: string,
  ): {
    protein: number;
    carbs: number;
    fat: number;
  } {
    let proteinGramsPerKg = 2.0;
    if (weightGoal === 'lose') {
      proteinGramsPerKg = 2.2;
    } else if (weightGoal === 'gain') {
      proteinGramsPerKg = 2.0;
    }

    const protein = Math.round(weight * proteinGramsPerKg);
    const proteinCalories = protein * 4;
    const fatCalories = dailyCalories * 0.275;
    const fat = Math.round(fatCalories / 9);
    const carbCalories = dailyCalories - proteinCalories - fatCalories;
    const carbs = Math.round(carbCalories / 4);

    return {
      protein,
      carbs: Math.max(0, carbs),
      fat,
    };
  }

  private recalculateAllMacros(profile: UserNutritionProfileEntity): {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  } {
    const bmr = this.calculateBMR(
      Number(profile.weight),
      Number(profile.height),
      profile.age,
      profile.gender,
    );

    const tdee = this.calculateTDEE(bmr, profile.activityLevel);

    const dailyCalories = this.calculateDailyCalories(
      tdee,
      profile.weightGoal,
      Number(profile.weeklyWeightChange),
    );

    const macros = this.calculateMacros(
      dailyCalories,
      Number(profile.weight),
      profile.weightGoal,
    );

    return {
      dailyCalories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    };
  }

  private mapProfileToDto(
    profile: UserNutritionProfileEntity,
  ): UserNutritionProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      anthropometrics: {
        weight: Number(profile.weight),
        height: Number(profile.height),
        age: profile.age,
        gender: profile.gender,
        activityLevel: profile.activityLevel,
      },
      goals: {
        weightGoal: profile.weightGoal,
        targetWeight: Number(profile.targetWeight),
        weeklyWeightChange: Number(profile.weeklyWeightChange),
      },
      macroGoals: {
        dailyCalories: profile.dailyCalories,
        protein: Number(profile.proteinGrams),
        carbs: Number(profile.carbsGrams),
        fat: Number(profile.fatGrams),
      },
      preferences: {
        weightUnit: profile.weightUnit as WeightUnit,
        heightUnit: profile.heightUnit,
      },
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
