import { Module } from '@nestjs/common';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [NutritionController],
  providers: [NutritionService],
  imports: [HttpModule],
})
export class NutritionModule {}
