import { storageApi, type ImagePurpose, type ImageStatus, type ImageUploadResponse } from '@/services/api';

export const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const POLL_INTERVAL_MS = 1600;
const POLL_TIMEOUT_MS = 30000;

export interface ProcessedImageUploadResult {
  imageId: string;
  status: ImageStatus;
  url?: string;
  uploadKey?: string;
}

export function formatImageSize(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return 'jpg, png, webp 이미지만 업로드 가능합니다';
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return '15MB 이하의 이미지만 업로드 가능합니다';
  }

  return null;
}

export function toImageFile(blob: Blob, name: string) {
  return new File([blob], name, { type: blob.type || 'image/webp', lastModified: Date.now() });
}

// crop이 끝난 파일을 upload/ prefix로 올리고, WebP 변환은 Lambda가 비동기로 처리한다.
export async function uploadProcessedImage(
  purpose: ImagePurpose,
  file: File,
  targetId?: string,
): Promise<ProcessedImageUploadResult> {
  const validationMessage = validateImageFile(file);
  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const presign = await storageApi.createImageUpload({
    purpose,
    fileName: file.name,
    contentType: file.type,
    contentLength: file.size,
    targetId,
  });
  await storageApi.uploadToPresignedUrl(presign.uploadUrl, file, presign.headers);

  return {
    imageId: presign.imageId,
    uploadKey: presign.uploadKey,
    status: presign.status,
  };
}

// 화면은 처리 중 상태를 먼저 보여주고, 완료/실패만 짧게 polling한다.
export async function waitForImageProcessing(imageId: string): Promise<ImageUploadResponse> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    const result = await storageApi.getImageUpload(imageId);
    if (result.status === 'COMPLETED' || result.status === 'FAILED') {
      return result;
    }
    await new Promise(resolve => window.setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return storageApi.getImageUpload(imageId);
}

export function getProcessingImageLabel(status?: ImageStatus) {
  if (status === 'PROCESSING') return '이미지 처리 중입니다';
  if (status === 'FAILED') return '이미지 처리에 실패했습니다';
  return '';
}
