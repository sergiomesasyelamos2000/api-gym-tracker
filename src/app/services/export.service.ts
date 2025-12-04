import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface DietExportData {
  title: string;
  content: string;
  date?: string;
  userName?: string;
}

@Injectable()
export class ExportService {
  /**
   * Generate a PDF from diet plan text/markdown
   */
  async generateDietPDF(data: DietExportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .text(data.title || 'Plan de Nutrición', { align: 'center' });

        doc.moveDown(0.5);

        // Metadata
        if (data.userName) {
          doc
            .fontSize(12)
            .font('Helvetica')
            .text(`Usuario: ${data.userName}`, { align: 'center' });
        }

        if (data.date) {
          doc
            .fontSize(10)
            .font('Helvetica')
            .text(`Fecha: ${data.date}`, { align: 'center' });
        }

        doc.moveDown(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1);

        // Content - Parse markdown-like content
        this.parseAndRenderContent(doc, data.content);

        // End the document
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Parse markdown-like content and render to PDF
   */
  private parseAndRenderContent(doc: PDFKit.PDFDocument, content: string) {
    const lines = content.split('\n');
    let inTable = false;
    let tableData: string[][] = [];

    for (let line of lines) {
      line = line.trim();

      // Skip empty lines
      if (!line) {
        doc.moveDown(0.5);
        continue;
      }

      // Headers (# ## ###)
      if (line.startsWith('###')) {
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text(line.replace(/^###\s*/, ''), { continued: false });
        doc.moveDown(0.5);
      } else if (line.startsWith('##')) {
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .text(line.replace(/^##\s*/, ''), { continued: false });
        doc.moveDown(0.5);
      } else if (line.startsWith('#')) {
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .text(line.replace(/^#\s*/, ''), { continued: false });
        doc.moveDown(0.5);
      }
      // Table detection (markdown tables with |)
      else if (line.includes('|')) {
        const cells = line
          .split('|')
          .map(cell => cell.trim())
          .filter(cell => cell);

        // Skip separator lines (---|---|---)
        if (cells.every(cell => /^-+$/.test(cell))) {
          continue;
        }

        tableData.push(cells);
      }
      // List items
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        doc
          .fontSize(11)
          .font('Helvetica')
          .text(`  • ${line.substring(2)}`, { continued: false });
        doc.moveDown(0.3);
      }
      // Numbered lists
      else if (/^\d+\.\s/.test(line)) {
        doc
          .fontSize(11)
          .font('Helvetica')
          .text(`  ${line}`, { continued: false });
        doc.moveDown(0.3);
      }
      // Bold text (**text**)
      else if (line.includes('**')) {
        const parts = line.split('**');
        for (let i = 0; i < parts.length; i++) {
          if (i % 2 === 0) {
            doc
              .fontSize(11)
              .font('Helvetica')
              .text(parts[i], { continued: true });
          } else {
            doc
              .fontSize(11)
              .font('Helvetica-Bold')
              .text(parts[i], { continued: true });
          }
        }
        doc.text(''); // End line
        doc.moveDown(0.3);
      }
      // Regular text
      else {
        doc.fontSize(11).font('Helvetica').text(line, { continued: false });
        doc.moveDown(0.3);
      }
    }

    // Render table if we collected any
    if (tableData.length > 0) {
      this.renderTable(doc, tableData);
    }
  }

  /**
   * Render a simple table
   */
  private renderTable(doc: PDFKit.PDFDocument, data: string[][]) {
    if (data.length === 0) return;

    const startX = 50;
    const startY = doc.y;
    const columnWidth = (doc.page.width - 100) / data[0].length;
    const rowHeight = 25;

    // Header row
    data[0].forEach((header, i) => {
      doc
        .rect(startX + i * columnWidth, startY, columnWidth, rowHeight)
        .fillAndStroke('#E3F2FD', '#1976D2');

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#000')
        .text(header, startX + i * columnWidth + 5, startY + 7, {
          width: columnWidth - 10,
          align: 'left',
        });
    });

    // Data rows
    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const y = startY + rowIndex * rowHeight;

      data[rowIndex].forEach((cell, colIndex) => {
        doc
          .rect(startX + colIndex * columnWidth, y, columnWidth, rowHeight)
          .stroke('#BDBDBD');

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#000')
          .text(cell, startX + colIndex * columnWidth + 5, y + 7, {
            width: columnWidth - 10,
            align: 'left',
          });
      });
    }

    doc.moveDown(2);
  }

  /**
   * Generate CSV from diet plan content
   * This is a simple implementation - client will handle this
   */
  generateCSV(content: string): string {
    const lines = content.split('\n');
    const csvLines: string[] = [];

    for (const line of lines) {
      if (line.includes('|')) {
        const cells = line
          .split('|')
          .map(cell => cell.trim())
          .filter(cell => cell);

        // Skip separator lines
        if (cells.every(cell => /^-+$/.test(cell))) {
          continue;
        }

        csvLines.push(cells.map(cell => `"${cell}"`).join(','));
      }
    }

    return csvLines.join('\n');
  }
}
