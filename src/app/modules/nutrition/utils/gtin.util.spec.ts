import { normalizeGtin } from './gtin.util';

describe('normalizeGtin', () => {
  it('accepts Prozis EAN-13 and builds variants', () => {
    const result = normalizeGtin('5600380893930');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.canonical).toBe('5600380893930');
    expect(result.variants).toEqual(
      expect.arrayContaining(['5600380893930', '05600380893930']),
    );
  });

  it('accepts other known Prozis EAN-13 codes', () => {
    for (const code of ['5600380896511', '5600380896436']) {
      const result = normalizeGtin(code);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.canonical).toBe(code);
      }
    }
  });

  it('pads UPC-A to EAN-13', () => {
    // UPC-A for Coca-Cola classic (valid check digit)
    const result = normalizeGtin('049000028911');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.canonical).toBe('0049000028911');
    expect(result.variants).toEqual(
      expect.arrayContaining(['0049000028911', '049000028911']),
    );
  });

  it('extracts GTIN from GS1 AI (01) payload', () => {
    const result = normalizeGtin('(01)05600380893930');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.canonical).toBe('5600380893930');
  });

  it('extracts GTIN from unparenthesized DataMatrix AI 01 payload', () => {
    const result = normalizeGtin('0105600380893930');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.canonical).toBe('5600380893930');
  });

  it('drops ITF-14 indicator digit when remaining EAN-13 is valid', () => {
    const result = normalizeGtin('05600380893930');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.canonical).toBe('5600380893930');
    expect(result.variants).toEqual(
      expect.arrayContaining(['5600380893930', '05600380893930']),
    );
  });

  it('rejects URLs', () => {
    const result = normalizeGtin('https://prozis.com/p/123');
    expect(result).toEqual({ ok: false, reason: 'url' });
  });

  it('rejects non-digit product names', () => {
    const result = normalizeGtin('Prozis Whey');
    expect(result).toEqual({ ok: false, reason: 'non_digit' });
  });

  it('rejects blank input', () => {
    expect(normalizeGtin('')).toEqual({ ok: false, reason: 'empty' });
    expect(normalizeGtin('   ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects bad checksum', () => {
    const result = normalizeGtin('5600380893931');
    expect(result).toEqual({ ok: false, reason: 'bad_checksum' });
  });

  it('rejects unsupported lengths after digit extraction', () => {
    const result = normalizeGtin('12345');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('bad_length');
  });
});
