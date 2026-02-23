/**
 * 股票详情页组件测试
 *
 * @module components/skeletons/__tests__/AStockDetailSkeleton.test
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AStockDetailSkeleton, TopListPanelSkeleton, MoneyFlowCardSkeleton, MarginPanelSkeleton } from '../AStockDetailSkeleton';

describe('AStockDetailSkeleton', () => {
  it('renders with default props', () => {
    const { container } = render(<AStockDetailSkeleton />);
    expect(container).toBeTruthy();
  });

  it('renders without charts when showCharts is false', () => {
    const { container } = render(<AStockDetailSkeleton showCharts={false} />);
    expect(container).toBeTruthy();
  });

  it('renders without toplist when showTopList is false', () => {
    const { container } = render(<AStockDetailSkeleton showTopList={false} />);
    expect(container).toBeTruthy();
  });

  it('renders without moneyFlow when showMoneyFlow is false', () => {
    const { container } = render(<AStockDetailSkeleton showMoneyFlow={false} />);
    expect(container).toBeTruthy();
  });

  it('renders without margin when showMargin is false', () => {
    const { container } = render(<AStockDetailSkeleton showMargin={false} />);
    expect(container).toBeTruthy();
  });
});

describe('TopListPanelSkeleton', () => {
  it('renders correctly', () => {
    const { container } = render(<TopListPanelSkeleton />);
    expect(container).toBeTruthy();
  });
});

describe('MoneyFlowCardSkeleton', () => {
  it('renders correctly', () => {
    const { container } = render(<MoneyFlowCardSkeleton />);
    expect(container).toBeTruthy();
  });
});

describe('MarginPanelSkeleton', () => {
  it('renders correctly', () => {
    const { container } = render(<MarginPanelSkeleton />);
    expect(container).toBeTruthy();
  });
});
