export interface ScrollAffordanceMetrics {
  scrollOffset: number;
  clientSize: number;
  scrollSize: number;
}

export interface ScrollAffordanceState {
  hasOverflow: boolean;
  canScrollStart: boolean;
  canScrollEnd: boolean;
  startFadeOpacity: number;
  endFadeOpacity: number;
}

export const EMPTY_SCROLL_AFFORDANCE: ScrollAffordanceState = {
  hasOverflow: false,
  canScrollStart: false,
  canScrollEnd: false,
  startFadeOpacity: 0,
  endFadeOpacity: 0,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function getFadeOpacity(distanceFromEdge: number, threshold: number, rampDistance: number) {
  if (distanceFromEdge <= threshold) {
    return 0;
  }

  // 가장자리에서는 연하게 시작하고 조금 스크롤하면 완전한 힌트로 보이게 한다.
  const progress = clamp((distanceFromEdge - threshold) / rampDistance, 0, 1);
  return Number((0.35 + progress * 0.65).toFixed(2));
}

export function getScrollAffordanceState(
  metrics: ScrollAffordanceMetrics,
  threshold = 1,
  fadeRampDistance = 40,
): ScrollAffordanceState {
  const maxOffset = Math.max(metrics.scrollSize - metrics.clientSize, 0);
  const offset = Math.max(metrics.scrollOffset, 0);
  const hasOverflow = maxOffset > threshold;

  if (!hasOverflow) {
    return EMPTY_SCROLL_AFFORDANCE;
  }

  const startDistance = offset;
  const endDistance = maxOffset - offset;
  const canScrollStart = startDistance > threshold;
  const canScrollEnd = endDistance > threshold;

  return {
    hasOverflow,
    canScrollStart,
    canScrollEnd,
    startFadeOpacity: canScrollStart ? getFadeOpacity(startDistance, threshold, fadeRampDistance) : 0,
    endFadeOpacity: canScrollEnd ? getFadeOpacity(endDistance, threshold, fadeRampDistance) : 0,
  };
}
