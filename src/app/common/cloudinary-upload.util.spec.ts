import {
  isInlineBase64Image,
  isRemoteHttpUrl,
} from './cloudinary-upload.util';

describe('cloudinary-upload.util helpers', () => {
  it('detects remote http(s) urls', () => {
    expect(isRemoteHttpUrl('https://res.cloudinary.com/x/image/upload/a.png')).toBe(
      true,
    );
    expect(isRemoteHttpUrl('http://example.com/a.png')).toBe(true);
    expect(isRemoteHttpUrl('data:image/png;base64,aaa')).toBe(false);
    expect(isRemoteHttpUrl(null)).toBe(false);
  });

  it('detects inline base64 payloads', () => {
    expect(isInlineBase64Image('data:image/png;base64,iVBORw0KGgo')).toBe(true);
    expect(
      isInlineBase64Image('https://res.cloudinary.com/x/image/upload/a.png'),
    ).toBe(false);
    expect(isInlineBase64Image('short')).toBe(false);
    expect(isInlineBase64Image('a'.repeat(250))).toBe(true);
  });
});
