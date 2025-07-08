import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NutritionService } from './nutrition.service';

@Controller('nutrition')
export class NutritionController {
  constructor(private nutritionService: NutritionService) {}

  @Post()
  async chat(@Body('text') text: string) {
    const base = await this.nutritionService.chat(text);
    return { reply: base };
  }

  @Post('photo')
  @UseInterceptors(FileInterceptor('file'))
  async analyzePhoto(@UploadedFile() file: Express.Request) {
    if (!file) {
      throw new Error('No se recibió ningún archivo');
    }

    const items = await this.nutritionService.recognizeFood(file);

    return { items };
  }

  @Post('barcode')
  async scanBarcode(@Body() body: any) {
    const product = await this.nutritionService.scanCode(body.code);
    return product;
  }

  @Get('products')
  async getAllProducts(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    console.log('page:', page, 'pageSize:', pageSize);

    return this.nutritionService.getAllProducts(page, pageSize);
  }
}
