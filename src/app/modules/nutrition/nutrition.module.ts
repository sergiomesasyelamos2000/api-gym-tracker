import {
  CustomMealEntity,
  CustomProductEntity,
  FavoriteProductEntity,
  FoodEntryEntity,
  ShoppingListItemEntity,
  UserNutritionProfileEntity,
} from '@app/entity-data-models';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';
import { AIService } from '../../services/ai.service';
import { GeminiProvider } from '../../services/gemini.provider';
import { GroqProvider } from '../../services/groq.provider';
import { RoutineModule } from '../routine/routine.module';

@Module({
  controllers: [NutritionController],
  providers: [NutritionService, AIService, GeminiProvider, GroqProvider],
  imports: [
    HttpModule,
    AuthModule,
    RoutineModule,
    TypeOrmModule.forFeature([
      UserNutritionProfileEntity,
      FoodEntryEntity,
      ShoppingListItemEntity,
      FavoriteProductEntity,
      CustomProductEntity,
      CustomMealEntity,
    ]),
  ],
})
export class NutritionModule {}
