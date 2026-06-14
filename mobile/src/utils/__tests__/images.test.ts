jest.mock('../../services/api', () => ({
  storageApi: {
    createImageUpload: jest.fn(),
    uploadToPresignedUrl: jest.fn(),
    getImageUpload: jest.fn(),
  },
}));

import { MAX_IMAGE_SIZE_BYTES, completedImageUrl, processingImageLabel, validatePickedImage } from '../images';

describe('mobile image upload boundaries', () => {
  it('accepts jpg png webp up to 15MB', () => {
    expect(validatePickedImage({ uri: 'file://a.jpg', mimeType: 'image/jpeg', fileSize: MAX_IMAGE_SIZE_BYTES })).toBeNull();
    expect(validatePickedImage({ uri: 'file://a.png', mimeType: 'image/png', fileSize: 1024 })).toBeNull();
    expect(validatePickedImage({ uri: 'file://a.webp', mimeType: 'image/webp', fileSize: 1024 })).toBeNull();
  });

  it('rejects unsupported types and files above 15MB', () => {
    expect(validatePickedImage({ uri: 'file://a.gif', mimeType: 'image/gif', fileSize: 1024 })).toContain('jpg, png, webp');
    expect(validatePickedImage({ uri: 'file://a.jpg', mimeType: 'image/jpeg', fileSize: MAX_IMAGE_SIZE_BYTES + 1 })).toContain('15MB');
  });

  it('uses blob size when native asset size is missing', () => {
    expect(validatePickedImage({ uri: 'file://a.jpg', mimeType: 'image/jpeg' }, MAX_IMAGE_SIZE_BYTES + 1)).toContain('15MB');
  });

  it('prefers thumbnail URL for completed profile-like images', () => {
    expect(completedImageUrl({ status: 'COMPLETED', thumbnailUrl: 'thumb.webp', url: 'full.webp' })).toBe('thumb.webp');
    expect(completedImageUrl({ status: 'COMPLETED', url: 'full.webp' })).toBe('full.webp');
    expect(completedImageUrl({ status: 'PROCESSING', url: 'full.webp' })).toBeUndefined();
  });

  it('maps processing labels', () => {
    expect(processingImageLabel('PROCESSING')).toBe('이미지 처리 중입니다');
    expect(processingImageLabel('FAILED')).toBe('이미지 처리에 실패했습니다');
    expect(processingImageLabel('COMPLETED')).toBe('');
  });
});
