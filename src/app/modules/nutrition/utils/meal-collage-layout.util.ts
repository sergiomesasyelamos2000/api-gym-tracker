export type CollageCell = {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
};

export const MEAL_COLLAGE_CANVAS = 800;
export const MEAL_COLLAGE_MAX_SOURCES = 100;

export function collectMealProductImageUrls(
  products: ReadonlyArray<{ productImage?: string | null }>,
  options?: { dedupe?: boolean; maxSources?: number },
): string[] {
  const dedupe = options?.dedupe !== false;
  const maxSources = options?.maxSources ?? MEAL_COLLAGE_MAX_SOURCES;
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const product of products) {
    const raw = product.productImage?.trim();
    if (!raw) continue;
    if (dedupe && seen.has(raw)) continue;
    if (dedupe) seen.add(raw);
    urls.push(raw);
    if (urls.length >= maxSources) break;
  }

  return urls;
}

export function computeMealCollageLayout(
  count: number,
  canvasWidth: number = MEAL_COLLAGE_CANVAS,
  canvasHeight: number = canvasWidth,
): CollageCell[] {
  if (count <= 0) return [];

  const w = canvasWidth;
  const h = canvasHeight;

  if (count === 1) {
    return [{ x: 0, y: 0, width: w, height: h, index: 0 }];
  }

  if (count === 2) {
    const half = w / 2;
    return [
      { x: 0, y: 0, width: half, height: h, index: 0 },
      { x: half, y: 0, width: half, height: h, index: 1 },
    ];
  }

  if (count === 3) {
    const halfW = w / 2;
    const halfH = h / 2;
    return [
      { x: 0, y: 0, width: halfW, height: h, index: 0 },
      { x: halfW, y: 0, width: halfW, height: halfH, index: 1 },
      { x: halfW, y: halfH, width: halfW, height: halfH, index: 2 },
    ];
  }

  if (count === 4) {
    const halfW = w / 2;
    const halfH = h / 2;
    return [
      { x: 0, y: 0, width: halfW, height: halfH, index: 0 },
      { x: halfW, y: 0, width: halfW, height: halfH, index: 1 },
      { x: 0, y: halfH, width: halfW, height: halfH, index: 2 },
      { x: halfW, y: halfH, width: halfW, height: halfH, index: 3 },
    ];
  }

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cellW = w / cols;
  const cellH = h / rows;
  const cells: CollageCell[] = [];

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    cells.push({
      x: col * cellW,
      y: row * cellH,
      width: cellW,
      height: cellH,
      index: i,
    });
  }

  return cells;
}

export function inferLegacyMealImageSource(meal: {
  image?: string | null;
  products?: ReadonlyArray<{ productImage?: string | null }>;
}): 'user' | 'collage' {
  if (!meal.image) return 'collage';
  const urls = collectMealProductImageUrls(meal.products ?? []);
  if (urls.length > 0 && meal.image === urls[0]) {
    return 'collage';
  }
  return 'user';
}
