export type GtinNormalization =
  | { ok: true; canonical: string; variants: string[] }
  | {
      ok: false;
      reason: 'empty' | 'url' | 'non_digit' | 'bad_length' | 'bad_checksum';
    };

const GS1_AI_01 = /\(01\)\s*(\d{14})/;

/** GS1 check digit over body digits (all but last). */
export function isValidGtinChecksum(digits: string): boolean {
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(digits)) {
    return false;
  }
  const body = digits.slice(0, -1);
  let sum = 0;
  for (let i = 0; i < body.length; i += 1) {
    const digit = Number(body[body.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === Number(digits[digits.length - 1]);
}

function uniqueVariants(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function buildVariants(canonical: string, extras: string[] = []): string[] {
  const variants = [canonical, ...extras];
  if (canonical.length === 13) {
    variants.push(`0${canonical}`);
    if (canonical.startsWith('0')) {
      variants.push(canonical.slice(1));
    }
  }
  if (canonical.length === 8) {
    variants.push(canonical.padStart(13, '0'));
  }
  return uniqueVariants(variants);
}

/**
 * Normalize a scanner payload to a canonical retail GTIN and lookup variants.
 */
export function normalizeGtin(raw: string): GtinNormalization {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) {
    return { ok: false, reason: 'empty' };
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.includes('://')
  ) {
    return { ok: false, reason: 'url' };
  }

  const aiMatch = trimmed.match(GS1_AI_01);
  let digits = aiMatch?.[1] ?? trimmed.replace(/\D/g, '');

  // Unparenthesized GS1 DataMatrix: AI (01) + 14-digit GTIN → 16 digits
  if (!aiMatch && digits.length === 16 && digits.startsWith('01')) {
    digits = digits.slice(2);
  }

  if (!digits) {
    return { ok: false, reason: 'non_digit' };
  }

  if (![8, 12, 13, 14].includes(digits.length)) {
    return { ok: false, reason: 'bad_length' };
  }

  if (digits.length === 12) {
    const ean13 = `0${digits}`;
    if (!isValidGtinChecksum(ean13) && !isValidGtinChecksum(digits)) {
      return { ok: false, reason: 'bad_checksum' };
    }
    const canonical = isValidGtinChecksum(ean13) ? ean13 : digits;
    if (canonical.length === 12) {
      // Rare: UPC with valid 12-digit checksum only — still pad for OFF.
      const padded = `0${canonical}`;
      if (!isValidGtinChecksum(padded)) {
        return { ok: false, reason: 'bad_checksum' };
      }
      return {
        ok: true,
        canonical: padded,
        variants: buildVariants(padded, [digits]),
      };
    }
    return {
      ok: true,
      canonical,
      variants: buildVariants(canonical, [digits]),
    };
  }

  if (digits.length === 14) {
    if (!isValidGtinChecksum(digits)) {
      return { ok: false, reason: 'bad_checksum' };
    }
    const withoutIndicator = digits.slice(1);
    if (isValidGtinChecksum(withoutIndicator)) {
      return {
        ok: true,
        canonical: withoutIndicator,
        variants: buildVariants(withoutIndicator, [digits]),
      };
    }
    return {
      ok: true,
      canonical: digits,
      variants: buildVariants(digits),
    };
  }

  // EAN-8 or EAN-13
  if (!isValidGtinChecksum(digits)) {
    return { ok: false, reason: 'bad_checksum' };
  }

  return {
    ok: true,
    canonical: digits,
    variants: buildVariants(digits),
  };
}
