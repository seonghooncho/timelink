import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImageIcon, X } from 'lucide-react';
import { appToast } from '@/lib/appToast';
import { toImageFile } from '@/lib/images';

interface ImageCropModalProps {
  file: File;
  title: string;
  description?: string;
  outputNamePrefix: string;
  aspectRatio?: number;
  outputWidth?: number;
  onClose: () => void;
  onConfirm: (file: File, previewUrl: string) => void;
}

const DEFAULT_OUTPUT_WIDTH = 1024;

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  file,
  title,
  description,
  outputNamePrefix,
  aspectRatio = 1,
  outputWidth = DEFAULT_OUTPUT_WIDTH,
  onClose,
  onConfirm,
}) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isSaving, setIsSaving] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; position: { x: number; y: number } } | null>(null);

  const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      position,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    const sensitivity = 100 / Math.max(160, outputWidth / zoom);

    setPosition({
      x: clamp(dragRef.current.position.x - dx * sensitivity, 0, 100),
      y: clamp(dragRef.current.position.y - dy * sensitivity, 0, 100),
    });
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const handleConfirm = async () => {
    const image = imageRef.current;
    if (!image || !image.naturalWidth || !image.naturalHeight) {
      appToast.error('이미지를 불러오지 못했습니다');
      return;
    }

    setIsSaving(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = Math.round(outputWidth / aspectRatio);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('이미지 편집을 시작할 수 없습니다');

      const crop = getCrop(image.naturalWidth, image.naturalHeight, aspectRatio, zoom, position);
      context.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
      if (!blob) throw new Error('이미지를 변환하지 못했습니다');

      const croppedFile = toImageFile(blob, `${outputNamePrefix}-${Date.now()}.webp`);
      const previewUrl = URL.createObjectURL(blob);
      onConfirm(croppedFile, previewUrl);
    } catch (error) {
      appToast.error('이미지 편집에 실패했습니다', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 app-layer-modal flex items-end justify-center bg-black/50 app-bottom-sheet-root" onClick={onClose}>
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-elevated animate-fade-in app-bottom-sheet-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-foreground">{title}</h3>
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 py-4 scrollbar-thin-soft">
          <div
            className="mx-auto w-full max-w-[18rem] touch-none overflow-hidden rounded-2xl border border-border bg-muted"
            style={{ aspectRatio }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            <img
              ref={imageRef}
              src={objectUrl}
              alt="선택한 이미지"
              className="h-full w-full select-none object-cover"
              draggable={false}
              style={{
                objectPosition: `${position.x}% ${position.y}%`,
                transform: `scale(${zoom})`,
                transformOrigin: `${position.x}% ${position.y}%`,
              }}
            />
          </div>

          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-muted-foreground">
              확대
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-muted-foreground">
                가로 위치
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={position.x}
                  onChange={(event) => setPosition(prev => ({ ...prev, x: Number(event.target.value) }))}
                  className="mt-2 w-full accent-primary"
                />
              </label>
              <label className="block text-xs font-semibold text-muted-foreground">
                세로 위치
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={position.y}
                  onChange={(event) => setPosition(prev => ({ ...prev, y: Number(event.target.value) }))}
                  className="mt-2 w-full accent-primary"
                />
              </label>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-muted px-3 py-3">
            <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-[11px] leading-5 text-muted-foreground">
              손가락으로 사진을 움직이거나 슬라이더로 위치를 맞춘 뒤 저장하세요.
            </p>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-muted py-3 text-sm font-semibold text-foreground"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving}
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {isSaving ? '처리 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
};

function getCrop(width: number, height: number, aspectRatio: number, zoom: number, position: { x: number; y: number }) {
  let cropWidth = width;
  let cropHeight = width / aspectRatio;
  if (cropHeight > height) {
    cropHeight = height;
    cropWidth = height * aspectRatio;
  }
  cropWidth /= zoom;
  cropHeight /= zoom;

  return {
    width: cropWidth,
    height: cropHeight,
    x: (width - cropWidth) * (position.x / 100),
    y: (height - cropHeight) * (position.y / 100),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default ImageCropModal;
