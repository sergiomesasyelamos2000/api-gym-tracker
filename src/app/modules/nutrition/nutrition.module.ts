import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';
import { HttpModule } from '@nestjs/axios';
import {
  UserNutritionProfileEntity,
  FoodEntryEntity,
  ShoppingListItemEntity,
  FavoriteProductEntity,
  CustomProductEntity,
  CustomMealEntity,
} from '@app/entity-data-models';

@Module({
  controllers: [NutritionController],
  providers: [NutritionService],
  imports: [
    HttpModule,
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
