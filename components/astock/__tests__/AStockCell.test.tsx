/**
 * AStockCell 组件单元测试
 *
 * 测试 A 股股票代码单元格组件的功能
 * @module components/astock/__tests__/AStockCell.test.tsx
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AStockCell } from '../AStockCell';

// Mock 依赖
vi.mock('@/lib/data-sources/astock', () => ({
  AStockCodeUtil: {
    extractCode: vi.fn((symbol: string) => symbol.split('.')[0]),
    getExchange: vi.fn((symbol: string) => {
      const suffix = symbol.split('.')[1]?.toUpperCase();
      if (suffix === 'SH' || suffix === 'SS') return 'SH';
      if (suffix === 'SZ' || suffix === 'SE') return 'SZ';
      if (suffix === 'BJ') return 'BJ';
      return undefined;
    }),
  },
}));

describe('AStockCell', () => {
  describe('基本渲染', () => {
    it('应正确渲染股票代码', () => {
      const { container } = render(<AStockCell tsCode="600519.SH" />);
      expect(container.innerHTML).toContain('600519');
      expect(container.innerHTML).toContain('SH');
    });

    it('不显示交易所时只显示代码', () => {
      const { container } = render(<AStockCell tsCode="600519.SH" showExchange={false} />);
      expect(container.innerHTML).toContain('600519');
      expect(container.innerHTML).not.toContain('SH');
    });

    it('支持不同尺寸', () => {
      const { container: sm } = render(<AStockCell tsCode="600519.SH" size="sm" />);
      const { container: md } = render(<AStockCell tsCode="600519.SH" size="md" />);
      const { container: lg } = render(<AStockCell tsCode="600519.SH" size="lg" />);

      expect(sm.innerHTML).toContain('text-xs');
      expect(md.innerHTML).toContain('text-sm');
      expect(lg.innerHTML).toContain('text-base');
    });
  });

  describe('无障碍性', () => {
    it('可复制时应有 button 角色', () => {
      const { container } = render(<AStockCell tsCode="600519.SH" copyable />);
      expect(container.querySelector('[role="button"]')).toBeDefined();
    });

    it('不可复制时不应有 button 角色', () => {
      const { container } = render(<AStockCell tsCode="600519.SH" copyable={false} />);
      expect(container.querySelector('[role="button"]')).toBeNull();
    });
  });

  describe('样式类名', () => {
    it('应有 font-mono 类名', () => {
      const { container } = render(<AStockCell tsCode="600519.SH" />);
      expect(container.querySelector('.font-mono')).toBeDefined();
    });

    it('应有 rounded 类名', () => {
      const { container } = render(<AStockCell tsCode="600519.SH" />);
      expect(container.querySelector('.rounded')).toBeDefined();
    });

    it('应有 cursor-pointer 类名', () => {
      const { container } = render(<AStockCell tsCode="600519.SH" copyable />);
      expect(container.querySelector('.cursor-pointer')).toBeDefined();
    });
  });
});
