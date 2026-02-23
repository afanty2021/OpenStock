/**
 * LimitPriceDisplay 组件单元测试
 *
 * 测试涨跌停价格显示组件的功能
 * @module components/astock/__tests__/LimitPriceDisplay.test.tsx
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LimitPriceDisplay, CompactLimitPriceDisplay } from '../LimitPriceDisplay';

// Mock AStockCodeUtil
vi.mock('@/lib/data-sources/astock', () => ({
  AStockCodeUtil: {
    getLimitPct: vi.fn((symbol: string, name?: string) => {
      // ST 股票
      if (name && name.includes('ST')) return 5;

      // 科创板/创业板
      if (symbol.startsWith('688') || symbol.startsWith('300')) return 20;

      // 北交所
      if (symbol.startsWith('8') || symbol.startsWith('4')) return 30;

      // 主板
      return 10;
    }),
  },
  MarketType: {
    SH_MAIN: 'SH_MAIN',
    SH_STAR: 'SH_STAR',
    SZ_MAIN: 'SZ_MAIN',
    SZ_GEM: 'SZ_GEM',
    BSE: 'BSE',
  },
}));

describe('LimitPriceDisplay', () => {
  describe('基本渲染', () => {
    it('应显示涨停价格', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} limitType="10%" />);
      // 100 * 1.1 = 110
      expect(container.innerHTML).toContain('110.00');
    });

    it('应显示涨停标签', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} limitType="10%" showLabel />);
      expect(container.innerHTML).toContain('涨停');
    });

    it('应显示涨跌停类型标签', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} limitType="10%" showLabel />);
      expect(container.innerHTML).toContain('10%');
      expect(container.innerHTML).toContain('主板');
    });
  });

  describe('涨跌停类型', () => {
    it('10% 主板应正确计算', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} limitType="10%" />);
      expect(container.innerHTML).toContain('110.00');
    });

    it('5% ST 应正确计算', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} limitType="5%" />);
      expect(container.innerHTML).toContain('105.00');
    });

    it('20% 创业板应正确计算', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} limitType="20%" />);
      expect(container.innerHTML).toContain('120.00');
    });

    it('30% 北交所应正确计算', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} limitType="30%" />);
      expect(container.innerHTML).toContain('130.00');
    });
  });

  describe('显示双价格', () => {
    it('showBoth 为 true 时应显示跌停价格', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} limitType="10%" showBoth />);
      expect(container.innerHTML).toContain('110.00');
      expect(container.innerHTML).toContain('90.00');
    });

    it('showBoth 为 true 时应显示跌停标签', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} limitType="10%" showBoth />);
      expect(container.innerHTML).toContain('跌停');
    });
  });

  describe('自动判断涨跌停类型', () => {
    it('应根据 symbol 自动判断 10%', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} symbol="600519.SH" />);
      expect(container.innerHTML).toContain('110.00');
    });

    it('应根据 symbol 自动判断 20%', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} symbol="300001.SZ" />);
      expect(container.innerHTML).toContain('120.00');
    });

    it('应根据股票名称判断 ST', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} symbol="600519.SH" stockName="ST茅台" />);
      expect(container.innerHTML).toContain('105.00');
    });
  });

  describe('尺寸', () => {
    it('sm 尺寸应使用较小文字', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} limitType="10%" size="sm" />);
      expect(container.querySelector('.text-xs')).toBeDefined();
    });

    it('md 尺寸应使用默认文字', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} limitType="10%" size="md" />);
      expect(container.querySelector('.text-sm')).toBeDefined();
    });

    it('lg 尺寸应使用较大文字', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} limitType="10%" size="lg" />);
      expect(container.querySelector('.text-base')).toBeDefined();
    });
  });

  describe('箭头显示', () => {
    it('应显示 ▲ 箭头', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} limitType="10%" />);
      expect(container.innerHTML).toContain('▲');
    });

    it('showBoth 时应显示两个箭头', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} limitType="10%" showBoth />);
      expect(container.innerHTML).toContain('▲');
      expect(container.innerHTML).toContain('▼');
    });
  });

  describe('颜色', () => {
    it('涨停应为红色', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} limitType="10%" />);
      expect(container.innerHTML).toContain('text-red-600');
    });

    it('跌停应为绿色', () => {
      const { container } = render(<LimitPriceDisplay currentPrice={100} limitType="10%" showBoth />);
      expect(container.innerHTML).toContain('text-green-600');
    });
  });
});

describe('CompactLimitPriceDisplay', () => {
  describe('基本渲染', () => {
    it('应显示涨停价格', () => {
      const { container } = render(<CompactLimitPriceDisplay currentPrice={100} limitType="10%" count={1} />);
      expect(container.innerHTML).toContain('110.00');
    });
  });

  describe('双价格显示', () => {
    it('count 为 2 时应显示跌停价格', () => {
      const { container } = render(<CompactLimitPriceDisplay currentPrice={100} limitType="10%" count={2} />);
      expect(container.innerHTML).toContain('110.00');
      expect(container.innerHTML).toContain('90.00');
    });
  });

  describe('无标签', () => {
    it('不应显示涨跌停标签', () => {
      const { container } = render(<CompactLimitPriceDisplay currentPrice={100} limitType="10%" count={1} />);
      expect(container.innerHTML).not.toContain('涨停');
    });
  });
});

describe('价格计算', () => {
  describe('calculateLimitUpPrice', () => {
    it('10% 涨停应正确计算', () => {
      const result = 100 * (1 + 10 / 100);
      expect(result).toBeCloseTo(110);
    });

    it('20% 涨停应正确计算', () => {
      const result = 100 * (1 + 20 / 100);
      expect(result).toBeCloseTo(120);
    });

    it('5% 涨停应正确计算', () => {
      const result = 100 * (1 + 5 / 100);
      expect(result).toBeCloseTo(105);
    });
  });

  describe('calculateLimitDownPrice', () => {
    it('10% 跌停应正确计算', () => {
      const result = 100 * (1 - 10 / 100);
      expect(result).toBeCloseTo(90);
    });

    it('20% 跌停应正确计算', () => {
      const result = 100 * (1 - 20 / 100);
      expect(result).toBeCloseTo(80);
    });

    it('5% 跌停应正确计算', () => {
      const result = 100 * (1 - 5 / 100);
      expect(result).toBeCloseTo(95);
    });
  });
});

describe('边界情况', () => {
  it('价格为 0 时应显示 0', () => {
    const { container } = render(<LimitPriceDisplay currentPrice={0} limitType="10%" />);
    expect(container.innerHTML).toContain('0.00');
  });

  it('负价格应正确计算', () => {
    const { container } = render(<LimitPriceDisplay currentPrice={-100} limitType="10%" />);
    // -100 * 1.1 = -110
    expect(container.innerHTML).toContain('-110.00');
  });

  it('小数价格应正确计算并显示', () => {
    const { container } = render(<LimitPriceDisplay currentPrice={152.50} limitType="10%" />);
    // 152.50 * 1.1 = 167.75
    expect(container.innerHTML).toContain('167.75');
  });
});
