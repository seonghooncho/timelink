import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  EMPTY_SCROLL_AFFORDANCE,
  getScrollAffordanceState,
  ScrollAffordanceMetrics,
  ScrollAffordanceState,
} from '@/lib/scrollAffordance';

type ScrollAxis = 'vertical' | 'horizontal';

interface UseScrollAffordanceOptions {
  axis?: ScrollAxis;
  threshold?: number;
  reachEndThreshold?: number;
  onReachEnd?: () => void;
}

const sameState = (a: ScrollAffordanceState, b: ScrollAffordanceState) => (
  a.hasOverflow === b.hasOverflow
  && a.canScrollStart === b.canScrollStart
  && a.canScrollEnd === b.canScrollEnd
);

export function useScrollAffordance<T extends HTMLElement>({
  axis = 'vertical',
  threshold = 1,
  reachEndThreshold = 48,
  onReachEnd,
}: UseScrollAffordanceOptions = {}) {
  const scrollRef = useRef<T | null>(null);
  const onReachEndRef = useRef(onReachEnd);
  const lastReachEndAtRef = useRef(0);
  const [state, setState] = useState<ScrollAffordanceState>(EMPTY_SCROLL_AFFORDANCE);

  useEffect(() => {
    onReachEndRef.current = onReachEnd;
  }, [onReachEnd]);

  const readMetrics = useCallback((element: T): ScrollAffordanceMetrics => {
    if (axis === 'horizontal') {
      return {
        scrollOffset: element.scrollLeft,
        clientSize: element.clientWidth,
        scrollSize: element.scrollWidth,
      };
    }

    return {
      scrollOffset: element.scrollTop,
      clientSize: element.clientHeight,
      scrollSize: element.scrollHeight,
    };
  }, [axis]);

  const measure = useCallback(() => {
    const element = scrollRef.current;
    if (!element) {
      setState(prev => sameState(prev, EMPTY_SCROLL_AFFORDANCE) ? prev : EMPTY_SCROLL_AFFORDANCE);
      return null;
    }

    const metrics = readMetrics(element);
    const next = getScrollAffordanceState(metrics, threshold);
    setState(prev => sameState(prev, next) ? prev : next);

    return { metrics, state: next };
  }, [readMetrics, threshold]);

  const refresh = useCallback(() => {
    measure();
  }, [measure]);

  const handleScroll = useCallback(() => {
    const result = measure();
    if (!result?.state.hasOverflow || !onReachEndRef.current) return;

    const remaining = Math.max(
      result.metrics.scrollSize - result.metrics.clientSize - result.metrics.scrollOffset,
      0,
    );

    if (remaining <= reachEndThreshold) {
      const now = Date.now();
      if (now - lastReachEndAtRef.current < 400) return;
      lastReachEndAtRef.current = now;
      onReachEndRef.current();
    }
  }, [measure, reachEndThreshold]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    refresh();
    const frameId = window.requestAnimationFrame(refresh);

    element.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', refresh);

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(refresh);
    resizeObserver?.observe(element);

    const mutationObserver = typeof MutationObserver === 'undefined'
      ? null
      : new MutationObserver(refresh);
    mutationObserver?.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      element.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', refresh);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [handleScroll, refresh]);

  return {
    scrollRef,
    refresh,
    ...state,
  };
}
