import {
  CustomMealEntity,
  CustomProductEntity,
  FavoriteProductEntity,
  FoodEntryEntity,
  ShoppingListItemEntity,
  UserEntity,
  UserNutritionProfileEntity,
} from '@app/entity-data-models';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';
import { ProductService } from './services/product.service';
import { MealService } from './services/meal.service';
import { DiaryService } from './services/diary.service';
import { ShoppingListService } from './services/shopping-list.service';
import { ProfileService } from './services/profile.service';
import { AIService } from '../../services/ai.service';
import { GeminiProvider } from '../../services/gemini.provider';
import { GroqProvider } from '../../services/groq.provider';
import { RoutineModule } from '../routine/routine.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  controllers: [NutritionController],
  providers: [
    NutritionService,
    ProductService,
    MealService,
    DiaryService,
    ShoppingListService,
    ProfileService,
    AIService,
    GeminiProvider,
    GroqProvider,
  ],
  imports: [
    HttpModule,
    AuthModule,
    RoutineModule,
    SubscriptionModule,
    TypeOrmModule.forFeature([
      UserNutritionProfileEntity,
      FoodEntryEntity,
      ShoppingListItemEntity,
      FavoriteProductEntity,
      CustomProductEntity,
      CustomMealEntity,
      UserEntity,
    ]),
  ],
})
export class NutritionModule {}
