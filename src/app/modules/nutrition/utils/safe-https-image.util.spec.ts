import { isAllowedHttpsImageUrl } from './safe-https-image.util';

describe('isAllowedHttpsImageUrl', () => {
  it('allows public https URLs', () => {
    expect(isAllowedHttpsImageUrl('https://images.openfoodfacts.org/a.jpg')).toBe(
      true,
    );
  });

  it('rejects non-https schemes', () => {
    expect(isAllowedHttpsImageUrl('http://example.com/a.jpg')).toBe(false);
    expect(isAllowedHttpsImageUrl('file:///tmp/a.jpg')).toBe(false);
    expect(isAllowedHttpsImageUrl('data:image/png;base64,abc')).toBe(false);
  });

  it('rejects localhost and private IPs', () => {
    expect(isAllowedHttpsImageUrl('https://localhost/a.jpg')).toBe(false);
    expect(isAllowedHttpsImageUrl('https://127.0.0.1/a.jpg')).toBe(false);
    expect(isAllowedHttpsImageUrl('https://192.168.1.10/a.jpg')).toBe(false);
    expect(isAllowedHttpsImageUrl('https://10.0.0.5/a.jpg')).toBe(false);
  });
});
