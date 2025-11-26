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

@Module({
  controllers: [NutritionController],
  providers: [NutritionService],
  imports: [
    HttpModule,
    AuthModule,
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
