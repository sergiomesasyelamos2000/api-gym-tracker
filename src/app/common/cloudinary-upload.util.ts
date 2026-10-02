import cloudinary from '../../config/cloudinary.config';

export type CloudinaryUploadFolder =
  | 'exercises/static'
  | 'exercises/custom'
  | 'nutrition/products'
  | 'nutrition/meals'
  | 'users/profile';

/**
 * Upload a PNG/JPEG buffer to Cloudinary and return the HTTPS secure URL.
 */
export async function uploadImageBufferToCloudinary(
  buffer: Buffer,
  folder: CloudinaryUploadFolder,
  options?: { mimeType?: 'image/png' | 'image/jpeg'; publicId?: string },
): Promise<string> {
  const mimeType = options?.mimeType ?? 'image/png';
  const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;
  return uploadDataUriToCloudinary(dataUri, folder, options?.publicId);
}

/**
 * Upload a data-URI or raw base64 string to Cloudinary.
 */
export async function uploadDataUriToCloudinary(
  imageData: string,
  folder: CloudinaryUploadFolder,
  publicId?: string,
): Promise<string> {
  const payload = normalizeImageDataUri(imageData);
  const result = await cloudinary.uploader.upload(payload, {
    folder,
    resource_type: 'image',
    public_id: publicId,
    overwrite: Boolean(publicId),
    transformation: [
      { width: 800, height: 800, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ],
  });
  return result.secure_url as string;
}

export function isRemoteHttpUrl(value?: string | null): boolean {
  if (!value) return false;
  return /^https?:\/\//i.test(value.trim());
}

/** True when imageUrl looks like inline base64 (raw or data URI), not an HTTP URL. */
export function isInlineBase64Image(value?: string | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed || isRemoteHttpUrl(trimmed)) return false;
  if (trimmed.startsWith('data:image')) return true;
  // Exercise sync historically stored raw base64 without data: prefix.
  return trimmed.length > 200 && !trimmed.includes('://');
}

function normalizeImageDataUri(imageData: string): string {
  const trimmed = imageData.trim();
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }
  return `data:image/png;base64,${trimmed}`;
}
