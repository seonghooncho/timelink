import { describe, expect, it } from 'vitest';
import { getScrollAffordanceState } from '@/lib/scrollAffordance';

describe('getScrollAffordanceState', () => {
  it('hides both fades when content does not overflow', () => {
    expect(getScrollAffordanceState({
      scrollOffset: 0,
      clientSize: 300,
      scrollSize: 300,
    })).toEqual({
      hasOverflow: false,
      canScrollStart: false,
      canScrollEnd: false,
      startFadeOpacity: 0,
      endFadeOpacity: 0,
    });
  });

  it('shows only the end fade at the start of overflowing content', () => {
    expect(getScrollAffordanceState({
      scrollOffset: 0,
      clientSize: 300,
      scrollSize: 620,
    })).toEqual({
      hasOverflow: true,
      canScrollStart: false,
      canScrollEnd: true,
      startFadeOpacity: 0,
      endFadeOpacity: 1,
    });
  });

  it('shows both fades in the middle of overflowing content', () => {
    expect(getScrollAffordanceState({
      scrollOffset: 160,
      clientSize: 300,
      scrollSize: 620,
    })).toEqual({
      hasOverflow: true,
      canScrollStart: true,
      canScrollEnd: true,
      startFadeOpacity: 1,
      endFadeOpacity: 1,
    });
  });

  it('shows only the start fade at the end of overflowing content', () => {
    expect(getScrollAffordanceState({
      scrollOffset: 320,
      clientSize: 300,
      scrollSize: 620,
    })).toEqual({
      hasOverflow: true,
      canScrollStart: true,
      canScrollEnd: false,
      startFadeOpacity: 1,
      endFadeOpacity: 0,
    });
  });

  it('ramps fade opacity near the scroll edges', () => {
    expect(getScrollAffordanceState({
      scrollOffset: 6,
      clientSize: 300,
      scrollSize: 620,
    })).toMatchObject({
      canScrollStart: true,
      canScrollEnd: true,
      startFadeOpacity: 0.43,
      endFadeOpacity: 1,
    });
  });
});
