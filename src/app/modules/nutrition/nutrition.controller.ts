import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NutritionService } from './nutrition.service';

@Controller('nutrition')
export class NutritionController {
  constructor(private nutrition: NutritionService) {}

  @Post()
  async chat(@Body('text') text: string) {
    const base = await this.nutrition.chat(text);
    return { reply: base };
  }

  @Post('photo')
  @UseInterceptors(FileInterceptor('file'))
  async analyzePhoto(@UploadedFile() file: Express.Request) {
    if (!file) {
      throw new Error('No se recibió ningún archivo');
    }

    const items = await this.nutrition.recognizeFood(file);

    return { items };
  }

  @Post('barcode')
  async analyzeBarcode(@Body('code') code: string) {
    const product = await this.nutrition.scanCode(code);
    return product; // devuelve nombre, calorías, macros…
  }
}
