import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import {
  computeMealCollageLayout,
  MEAL_COLLAGE_CANVAS,
  MEAL_COLLAGE_MAX_SOURCES,
} from '../utils/meal-collage-layout.util';
import { assertSafeHttpsImageUrl } from '../utils/safe-https-image.util';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

const FETCH_TIMEOUT_MS = 10_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FETCH_CONCURRENCY = 6;
const PLACEHOLDER_COLOR = { r: 229, g: 231, b: 235, alpha: 1 };

@Injectable()
export class MealCollageService {
  private readonly logger = new Logger(MealCollageService.name);

  constructor(private readonly httpService: HttpService) {}

  async buildCollageFromUrls(urls: string[]): Promise<Buffer | null> {
    const limited = urls.slice(0, MEAL_COLLAGE_MAX_SOURCES);
    if (limited.length === 0) return null;

    const buffers = await this.fetchImagesConcurrently(limited);
    const successCount = buffers.filter(Boolean).length;
    if (successCount === 0) {
      this.logger.warn('Meal collage: all product image fetches failed');
      return null;
    }

    const layout = computeMealCollageLayout(
      limited.length,
      MEAL_COLLAGE_CANVAS,
      MEAL_COLLAGE_CANVAS,
    );

    try {
      const base = sharp({
        create: {
          width: MEAL_COLLAGE_CANVAS,
          height: MEAL_COLLAGE_CANVAS,
          channels: 4,
          background: PLACEHOLDER_COLOR,
        },
      });

      const composites: Array<{
        input: Buffer;
        left: number;
        top: number;
      }> = [];

      for (const cell of layout) {
        const source = buffers[cell.index];
        if (!source) continue;

        const tile = await sharp(source, { limitInputPixels: 40_000_000 })
          .resize(Math.round(cell.width), Math.round(cell.height), {
            fit: 'cover',
            position: 'centre',
          })
          .png()
          .toBuffer();

        composites.push({
          input: tile,
          left: Math.round(cell.x),
          top: Math.round(cell.y),
        });
      }

      if (composites.length === 0) return null;

      return await base.composite(composites).png().toBuffer();
    } catch (error) {
      this.logger.error('Meal collage compose failed', error as Error);
      return null;
    }
  }

  async fetchImageBuffer(url: string): Promise<Buffer | null> {
    try {
      const safe = await assertSafeHttpsImageUrl(url);
      if (!safe) {
        this.logger.debug(`Skipped unsafe image URL: ${url}`);
        return null;
      }

      const response = await firstValueFrom(
        this.httpService.get(url, {
          responseType: 'arraybuffer',
          timeout: FETCH_TIMEOUT_MS,
          maxContentLength: MAX_IMAGE_BYTES,
          maxBodyLength: MAX_IMAGE_BYTES,
          maxRedirects: 0,
          headers: {
            Accept: 'image/*,*/*;q=0.8',
            'User-Agent': 'GymTrackerMealCollage/1.0',
          },
        }),
      );

      const data = response.data as ArrayBuffer;
      if (!data || data.byteLength === 0 || data.byteLength > MAX_IMAGE_BYTES) {
        return null;
      }

      return Buffer.from(data);
    } catch (error) {
      this.logger.debug(
        `Failed to fetch meal collage image: ${url} — ${(error as Error).message}`,
      );
      return null;
    }
  }

  private async fetchImagesConcurrently(
    urls: string[],
  ): Promise<Array<Buffer | null>> {
    const results: Array<Buffer | null> = new Array(urls.length).fill(null);
    let nextIndex = 0;

    const workers = Array.from(
      { length: Math.min(FETCH_CONCURRENCY, urls.length) },
      async () => {
        while (nextIndex < urls.length) {
          const index = nextIndex;
          nextIndex += 1;
          results[index] = await this.fetchImageBuffer(urls[index]);
        }
      },
    );

    await Promise.all(workers);
    return results;
  }
}
