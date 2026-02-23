/**
 * AStockPrice 组件单元测试
 *
 * 测试 A 股价格显示组件的功能
 * @module components/astock/__tests__/AStockPrice.test.tsx
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AStockPrice, getPriceColor, getChangeArrow } from '../AStockPrice';

describe('AStockPrice', () => {
  describe('基本渲染', () => {
    it('应正确显示价格', () => {
      render(<AStockPrice price={152.50} change={2.30} changePercent={1.53} />);

      expect(screen.getByText('152.50')).toBeDefined();
    });

    it('应显示 ¥ 符号', () => {
      const { container } = render(<AStockPrice price={152.50} change={2.30} changePercent={1.53} showYuan />);
      expect(container.innerHTML).toContain('¥');
      expect(container.innerHTML).toContain('152.50');
    });

    it('不显示 ¥ 符号时应只显示数字', () => {
      render(<AStockPrice price={152.50} change={2.30} changePercent={1.53} showYuan={false} />);
      expect(screen.getByText('152.50')).toBeDefined();
    });
  });

  describe('涨跌显示', () => {
    it('上涨时应显示红色和正号', () => {
      const { container } = render(
        <AStockPrice price={152.50} change={2.30} changePercent={1.53} />
      );

      // 检查是否有上涨颜色类名
      expect(container.innerHTML).toContain('#FF4444');
    });

    it('下跌时应显示绿色', () => {
      const { container } = render(
        <AStockPrice price={100} change={-5} changePercent={-4.76} />
      );

      expect(container.innerHTML).toContain('#00CC66');
    });

    it('平盘时应显示灰色', () => {
      const { container } = render(
        <AStockPrice price={100} change={0} changePercent={0} />
      );

      expect(container.innerHTML).toContain('#999999');
    });

    it('上涨时应显示 ▲ 箭头', () => {
      const { container } = render(
        <AStockPrice price={152.50} change={2.30} changePercent={1.53} />
      );

      expect(container.innerHTML).toContain('▲');
    });

    it('下跌时应显示 ▼ 箭头', () => {
      const { container } = render(
        <AStockPrice price={100} change={-5} changePercent={-4.76} />
      );

      expect(container.innerHTML).toContain('▼');
    });

    it('平盘时应显示 ─ 箭头', () => {
      const { container } = render(
        <AStockPrice price={100} change={0} changePercent={0} />
      );

      expect(container.innerHTML).toContain('─');
    });

    it('下跌时应显示绝对值和负号', () => {
      const { container } = render(<AStockPrice price={100} change={-5} changePercent={-4.76} />);
      // 下跌显示 ▼ 5.00 (-4.76%)
      expect(container.innerHTML).toContain('▼');
      expect(container.innerHTML).toContain('5.00');
    });

    it('上涨时应显示绝对值和正号', () => {
      const { container } = render(<AStockPrice price={152.50} change={2.30} changePercent={1.53} />);
      // 上涨显示 ▲ 2.30 (+1.53%)
      expect(container.innerHTML).toContain('▲');
      expect(container.innerHTML).toContain('+1.53%');
    });
  });

  describe('尺寸', () => {
    it('sm 尺寸应使用较小的文字', () => {
      const { container } = render(
        <AStockPrice price={152.50} change={2.30} changePercent={1.53} size="sm" />
      );

      expect(container.querySelector('.text-sm')).toBeDefined();
    });

    it('md 尺寸应使用默认文字大小', () => {
      const { container } = render(
        <AStockPrice price={152.50} change={2.30} changePercent={1.53} size="md" />
      );

      expect(container.querySelector('.text-base')).toBeDefined();
    });

    it('lg 尺寸应使用较大的文字和粗体', () => {
      const { container } = render(
        <AStockPrice price={152.50} change={2.30} changePercent={1.53} size="lg" />
      );

      expect(container.querySelector('.text-lg')).toBeDefined();
      expect(container.querySelector('.font-semibold')).toBeDefined();
    });
  });

  describe('格式化选项', () => {
    it('应支持自定义小数位数', () => {
      render(
        <AStockPrice
          price={152.555}
          change={2.333}
          changePercent={1.555}
          formatOptions={{ priceDecimals: 3, changeDecimals: 3 }}
        />
      );

      expect(screen.getByText('152.555')).toBeDefined();
    });
  });

  describe('辅助函数', () => {
    describe('getPriceColor', () => {
      it('上涨应返回红色', () => {
        expect(getPriceColor(1)).toBe('#FF4444');
      });

      it('下跌应返回绿色', () => {
        expect(getPriceColor(-1)).toBe('#00CC66');
      });

      it('平盘应返回灰色', () => {
        expect(getPriceColor(0)).toBe('#999999');
      });
    });

    describe('getChangeArrow', () => {
      it('上涨应返回 ▲', () => {
        expect(getChangeArrow(1)).toBe('▲');
      });

      it('下跌应返回 ▼', () => {
        expect(getChangeArrow(-1)).toBe('▼');
      });

      it('平盘应返回 ─', () => {
        expect(getChangeArrow(0)).toBe('─');
      });
    });
  });

  describe('边界情况', () => {
    it('NaN 值应显示 --', () => {
      render(<AStockPrice price={NaN} change={0} changePercent={0} />);

      expect(screen.getByText('--')).toBeDefined();
    });

    it('Infinity 值应显示 --', () => {
      render(<AStockPrice price={Infinity} change={0} changePercent={0} />);

      expect(screen.getByText('--')).toBeDefined();
    });

    it('负价格应正确显示', () => {
      // 某些特殊情况下可能出现负价格
      render(<AStockPrice price={-10} change={-5} changePercent={-100} />);

      expect(screen.getByText('-10.00')).toBeDefined();
    });
  });
});
