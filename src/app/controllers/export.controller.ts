import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from '../services/export.service';

class ExportPdfDto {
  title: string;
  content: string;
  userName?: string;
}

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('pdf')
  async generatePDF(@Body() data: ExportPdfDto, @Res() res: Response) {
    try {
      const pdfBuffer = await this.exportService.generateDietPDF({
        title: data.title || 'Plan de Nutrición',
        content: data.content,
        userName: data.userName,
        date: new Date().toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      });

      const fileName = `dieta_${Date.now()}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new HttpException(
        'Error al generar el PDF',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('csv')
  async generateCSV(@Body() data: { content: string }, @Res() res: Response) {
    try {
      const csv = this.exportService.generateCSV(data.content);

      const fileName = `dieta_${Date.now()}.csv`;

      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      });

      res.send(csv);
    } catch (error) {
      console.error('Error generating CSV:', error);
      throw new HttpException(
        'Error al generar el CSV',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
