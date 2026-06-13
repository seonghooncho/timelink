import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ImageIcon, X, ZoomIn, ZoomOut } from 'lucide-react';
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
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type Point = { x: number; y: number };

interface CropMetrics {
  frameWidth: number;
  frameHeight: number;
  naturalWidth: number;
  naturalHeight: number;
}

// 이미지 선택 후 실제 업로드 전에 자르기, 이동, 확대를 처리하는 공용 모달이다.
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
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [metrics, setMetrics] = useState<CropMetrics | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const offsetRef = useRef(offset);
  const zoomRef = useRef(zoom);
  const metricsRef = useRef<CropMetrics | null>(metrics);
  // 포인터 상태는 렌더링과 분리해 드래그와 핀치가 끊기지 않도록 관리한다.
  const activePointersRef = useRef<Map<number, Point>>(new Map());
  const dragRef = useRef<{ pointerId: number; x: number; y: number; offset: Point } | null>(null);
  const pinchRef = useRef<{ ids: [number, number]; distance: number; center: Point; zoom: number; offset: Point } | null>(null);

  const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const baseImageSize = metrics ? getBaseImageSize(metrics) : null;
  const zoomPercent = Math.round(zoom * 100);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setMetrics(null);
    activePointersRef.current.clear();
    dragRef.current = null;
    pinchRef.current = null;

    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const measureCropFrame = useCallback(() => {
    const frame = frameRef.current;
    const image = imageRef.current;
    if (!frame || !image?.naturalWidth || !image.naturalHeight) return;

    const next = {
      frameWidth: frame.clientWidth,
      frameHeight: frame.clientHeight,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    };

    setMetrics(prev => (
      prev
      && prev.frameWidth === next.frameWidth
      && prev.frameHeight === next.frameHeight
      && prev.naturalWidth === next.naturalWidth
      && prev.naturalHeight === next.naturalHeight
    ) ? prev : next);
    setOffset(prev => clampOffset(prev, next, zoomRef.current));
  }, []);

  useLayoutEffect(() => {
    measureCropFrame();
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(measureCropFrame);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [measureCropFrame, objectUrl]);

  const applyTransform = useCallback((nextOffset: Point, nextZoom: number) => {
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    const currentMetrics = metricsRef.current;
    const clampedOffset = currentMetrics ? clampOffset(nextOffset, currentMetrics, clampedZoom) : nextOffset;

    offsetRef.current = clampedOffset;
    zoomRef.current = clampedZoom;
    setOffset(clampedOffset);
    setZoom(clampedZoom);
  }, []);

  const startPinchIfPossible = useCallback(() => {
    const pointers = [...activePointersRef.current.entries()];
    if (pointers.length < 2) return;

    const [first, second] = pointers;
    const distance = getDistance(first[1], second[1]);
    if (distance <= 0) return;

    pinchRef.current = {
      ids: [first[0], second[0]],
      distance,
      center: getCenter(first[1], second[1]),
      zoom: zoomRef.current,
      offset: offsetRef.current,
    };
    dragRef.current = null;
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (activePointersRef.current.size >= 2) {
      startPinchIfPossible();
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offset: offsetRef.current,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(event.pointerId)) return;
    event.preventDefault();
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const pinch = pinchRef.current;
    if (pinch && activePointersRef.current.size >= 2) {
      // 핀치 중심 이동도 offset에 반영해 손가락 아래 이미지가 자연스럽게 따라오게 한다.
      const first = activePointersRef.current.get(pinch.ids[0]);
      const second = activePointersRef.current.get(pinch.ids[1]);
      if (!first || !second) {
        startPinchIfPossible();
        return;
      }

      const nextDistance = getDistance(first, second);
      const nextCenter = getCenter(first, second);
      const nextZoom = pinch.zoom * (nextDistance / pinch.distance);
      applyTransform({
        x: pinch.offset.x + nextCenter.x - pinch.center.x,
        y: pinch.offset.y + nextCenter.y - pinch.center.y,
      }, nextZoom);
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    applyTransform({
      x: drag.offset.x + event.clientX - drag.x,
      y: drag.offset.y + event.clientY - drag.y,
    }, zoomRef.current);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (activePointersRef.current.size >= 2) {
      startPinchIfPossible();
      return;
    }

    pinchRef.current = null;

    const remaining = [...activePointersRef.current.entries()][0];
    if (remaining) {
      dragRef.current = {
        pointerId: remaining[0],
        x: remaining[1].x,
        y: remaining[1].y,
        offset: offsetRef.current,
      };
    } else {
      dragRef.current = null;
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    applyTransform(offsetRef.current, zoomRef.current - event.deltaY * 0.002);
  };

  const handleConfirm = async () => {
    const image = imageRef.current;
    const currentMetrics = metricsRef.current;
    if (!image || !currentMetrics) {
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

      // 화면에서 보이는 crop frame을 원본 이미지 좌표로 환산한 뒤 WebP 파일로 만든다.
      const crop = getCrop(currentMetrics, zoomRef.current, offsetRef.current);
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
            className="relative mx-auto h-[min(74vw,22rem)] min-h-[18rem] w-full max-w-[22rem] touch-none overflow-hidden rounded-2xl border border-border bg-black"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onWheel={handleWheel}
          >
            <img
              ref={imageRef}
              src={objectUrl}
              alt="선택한 이미지"
              className="absolute left-1/2 top-1/2 max-w-none select-none object-fill will-change-transform"
              draggable={false}
              onLoad={measureCropFrame}
              style={{
                width: baseImageSize ? `${baseImageSize.width}px` : '100%',
                height: baseImageSize ? `${baseImageSize.height}px` : '100%',
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                opacity: metrics ? 1 : 0,
              }}
            />
            <div
              ref={frameRef}
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 z-10 w-[78%] max-w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-dashed border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.54)]"
              style={{ aspectRatio }}
            />
            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 rounded-full bg-black/45 px-3 py-1.5 text-center text-[11px] font-semibold text-white/90">
              드래그로 위치 조정 · 핀치 또는 슬라이더로 확대
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold text-muted-foreground" htmlFor="image-crop-zoom">
              <span className="flex items-center justify-between">
                <span>확대</span>
                <span className="text-[11px] text-foreground">{zoomPercent}%</span>
              </span>
              <span className="mt-2 flex items-center gap-3">
                <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  id="image-crop-zoom"
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step="0.01"
                  value={zoom}
                  onChange={(event) => applyTransform(offsetRef.current, Number(event.target.value))}
                  className="min-w-0 flex-1 accent-primary"
                />
                <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
              </span>
            </label>
            <div className="flex items-start gap-2 rounded-xl bg-muted px-3 py-3">
              <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-[11px] leading-5 text-muted-foreground">
                밝은 영역만 저장됩니다. 사진을 직접 밀어서 빠르게 맞추고, 필요하면 확대해 세부 위치를 조정하세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => applyTransform({ x: 0, y: 0 }, 1)}
              className="w-full rounded-xl border border-border bg-background py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              위치 초기화
            </button>
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

function getCrop(metrics: CropMetrics, zoom: number, offset: Point) {
  // CSS transform과 동일한 비율을 canvas 원본 좌표로 되돌린다.
  const scale = getBaseScale(metrics) * zoom;
  const cropWidth = metrics.frameWidth / scale;
  const cropHeight = metrics.frameHeight / scale;

  return {
    width: cropWidth,
    height: cropHeight,
    x: clamp((metrics.naturalWidth - cropWidth) / 2 - offset.x / scale, 0, metrics.naturalWidth - cropWidth),
    y: clamp((metrics.naturalHeight - cropHeight) / 2 - offset.y / scale, 0, metrics.naturalHeight - cropHeight),
  };
}

function getBaseScale(metrics: CropMetrics) {
  return Math.max(metrics.frameWidth / metrics.naturalWidth, metrics.frameHeight / metrics.naturalHeight);
}

function getBaseImageSize(metrics: CropMetrics) {
  const scale = getBaseScale(metrics);
  return {
    width: metrics.naturalWidth * scale,
    height: metrics.naturalHeight * scale,
  };
}

function clampOffset(offset: Point, metrics: CropMetrics, zoom: number) {
  const baseSize = getBaseImageSize(metrics);
  const maxX = Math.max(0, (baseSize.width * zoom - metrics.frameWidth) / 2);
  const maxY = Math.max(0, (baseSize.height * zoom - metrics.frameHeight) / 2);

  return {
    x: clamp(offset.x, -maxX, maxX),
    y: clamp(offset.y, -maxY, maxY),
  };
}

function getDistance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getCenter(a: Point, b: Point) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default ImageCropModal;
