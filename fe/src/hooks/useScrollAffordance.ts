import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefCallback } from 'react';
import {
  EMPTY_SCROLL_AFFORDANCE,
  getScrollAffordanceState,
  ScrollAffordanceMetrics,
  ScrollAffordanceState,
} from '@/lib/scrollAffordance';

type ScrollAxis = 'vertical' | 'horizontal';
type ScrollAffordanceRef<T extends HTMLElement> = RefCallback<T> & { current: T | null };

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
  && a.startFadeOpacity === b.startFadeOpacity
  && a.endFadeOpacity === b.endFadeOpacity
);

// 스크롤 가능 여부와 페이드 투명도를 한 곳에서 읽어 목록/모달 UI에 재사용한다.
export function useScrollAffordance<T extends HTMLElement>({
  axis = 'vertical',
  threshold = 1,
  reachEndThreshold = 48,
  onReachEnd,
}: UseScrollAffordanceOptions = {}) {
  const [scrollElement, setScrollElement] = useState<T | null>(null);
  const scrollRef = useMemo<ScrollAffordanceRef<T>>(() => {
    // 조건부 렌더링으로 ref 대상이 늦게 생겨도 다시 측정되도록 콜백 ref를 쓴다.
    const ref = ((node: T | null) => {
      if (ref.current === node) return;
      ref.current = node;
      setScrollElement(node);
    }) as ScrollAffordanceRef<T>;
    ref.current = null;
    return ref;
  }, []);
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
  }, [readMetrics, scrollRef, threshold]);

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
      // 끝 근처에서 같은 페이지 요청이 연속으로 나가지 않게 짧게 제한한다.
      if (now - lastReachEndAtRef.current < 400) return;
      lastReachEndAtRef.current = now;
      onReachEndRef.current();
    }
  }, [measure, reachEndThreshold]);

  useLayoutEffect(() => {
    const element = scrollElement;
    if (!element) {
      refresh();
      return;
    }

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
    // 목록 아이템 개수나 텍스트가 바뀌면 overflow 상태도 즉시 다시 계산한다.
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
  }, [scrollElement, handleScroll, refresh]);

  return {
    scrollRef,
    refresh,
    ...state,
  };
}
