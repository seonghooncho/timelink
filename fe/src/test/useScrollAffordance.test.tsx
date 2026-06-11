import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useScrollAffordance } from '@/hooks/useScrollAffordance';

const defineHorizontalMetrics = (element: HTMLDivElement, scrollLeft = 0) => {
  Object.defineProperties(element, {
    clientWidth: { configurable: true, value: 120 },
    scrollWidth: { configurable: true, value: 360 },
    scrollLeft: { configurable: true, value: scrollLeft },
  });
};

const DelayedHorizontalScroller = () => {
  const [visible, setVisible] = React.useState(false);
  const {
    scrollRef,
    hasOverflow,
    startFadeOpacity,
    endFadeOpacity,
  } = useScrollAffordance<HTMLDivElement>({ axis: 'horizontal' });

  const attachScrollRef = React.useCallback((node: HTMLDivElement | null) => {
    if (node) {
      defineHorizontalMetrics(node);
    }
    scrollRef(node);
  }, [scrollRef]);

  return (
    <div>
      <button type="button" onClick={() => setVisible(true)}>show</button>
      {visible ? (
        <div ref={attachScrollRef} data-testid="viewport">
          <div style={{ width: 360 }}>content</div>
        </div>
      ) : null}
      <output data-testid="state">
        {hasOverflow ? `${startFadeOpacity}-${endFadeOpacity}` : 'none'}
      </output>
    </div>
  );
};

describe('useScrollAffordance', () => {
  it('스크롤 요소가 나중에 렌더링되어도 overflow 상태를 측정한다', async () => {
    render(<DelayedHorizontalScroller />);

    expect(screen.getByTestId('state')).toHaveTextContent('none');

    fireEvent.click(screen.getByRole('button', { name: 'show' }));

    await waitFor(() => {
      expect(screen.getByTestId('state')).toHaveTextContent('0-1');
    });
  });

  it('나중에 렌더링된 스크롤 요소에도 scroll listener를 연결한다', async () => {
    render(<DelayedHorizontalScroller />);

    fireEvent.click(screen.getByRole('button', { name: 'show' }));
    await screen.findByTestId('viewport');

    const viewport = screen.getByTestId('viewport') as HTMLDivElement;
    defineHorizontalMetrics(viewport, 6);
    fireEvent.scroll(viewport);

    await waitFor(() => {
      expect(screen.getByTestId('state')).toHaveTextContent('0.43-1');
    });
  });
});
