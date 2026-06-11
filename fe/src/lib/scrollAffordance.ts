export interface ScrollAffordanceMetrics {
  scrollOffset: number;
  clientSize: number;
  scrollSize: number;
}

export interface ScrollAffordanceState {
  hasOverflow: boolean;
  canScrollStart: boolean;
  canScrollEnd: boolean;
}

export const EMPTY_SCROLL_AFFORDANCE: ScrollAffordanceState = {
  hasOverflow: false,
  canScrollStart: false,
  canScrollEnd: false,
};

export function getScrollAffordanceState(
  metrics: ScrollAffordanceMetrics,
  threshold = 1,
): ScrollAffordanceState {
  const maxOffset = Math.max(metrics.scrollSize - metrics.clientSize, 0);
  const offset = Math.max(metrics.scrollOffset, 0);
  const hasOverflow = maxOffset > threshold;

  if (!hasOverflow) {
    return EMPTY_SCROLL_AFFORDANCE;
  }

  return {
    hasOverflow,
    canScrollStart: offset > threshold,
    canScrollEnd: maxOffset - offset > threshold,
  };
}
