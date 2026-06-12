import { storageApi, type ImagePurpose, type ImageStatus, type ImageUploadResponse } from '../services/api';

export const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const POLL_INTERVAL_MS = 1600;
const POLL_TIMEOUT_MS = 30000;

export interface PickedImageAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}

export interface ProcessedImageUploadResult {
  imageId: string;
  uploadKey: string;
  status: ImageStatus;
}

export function validatePickedImage(asset: PickedImageAsset, blobSize?: number) {
  const type = asset.mimeType || 'image/jpeg';
  if (!ALLOWED_IMAGE_TYPES.includes(type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return 'jpg, png, webp 이미지만 업로드 가능합니다.';
  }

  const size = blobSize ?? asset.fileSize ?? 0;
  if (size > MAX_IMAGE_SIZE_BYTES) {
    return '15MB 이하의 이미지만 업로드 가능합니다.';
  }

  return null;
}

export async function assetToBlob(asset: PickedImageAsset) {
  const res = await fetch(asset.uri);
  return res.blob();
}

export async function uploadProcessedImage(
  purpose: ImagePurpose,
  asset: PickedImageAsset,
  targetId?: string,
): Promise<ProcessedImageUploadResult> {
  const blob = await assetToBlob(asset);
  const validation = validatePickedImage(asset, blob.size);
  if (validation) {
    throw new Error(validation);
  }

  const contentType = asset.mimeType || blob.type || 'image/jpeg';
  const presign = await storageApi.createImageUpload({
    purpose,
    fileName: asset.fileName || `${purpose.toLowerCase()}-${Date.now()}.jpg`,
    contentType,
    contentLength: blob.size,
    targetId,
  });

  await storageApi.uploadToPresignedUrl(presign.uploadUrl, blob, presign.headers);

  return {
    imageId: presign.imageId,
    uploadKey: presign.uploadKey,
    status: presign.status,
  };
}

export async function waitForImageProcessing(imageId: string) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const result = await storageApi.getImageUpload(imageId);
    if (result.status === 'COMPLETED' || result.status === 'FAILED') {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return storageApi.getImageUpload(imageId);
}

export function processingImageLabel(status?: ImageStatus) {
  if (status === 'PROCESSING') return '이미지 처리 중입니다';
  if (status === 'FAILED') return '이미지 처리에 실패했습니다';
  return '';
}

export function completedImageUrl(result: ImageUploadResponse) {
  return result.status === 'COMPLETED' ? result.url : undefined;
}
