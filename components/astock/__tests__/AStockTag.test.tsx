/**
 * AStockTag 组件单元测试
 *
 * 测试 A 股状态标签组件的功能
 * @module components/astock/__tests__/AStockTag.test.tsx
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AStockTag, ExchangeSelector, createExchangeTag, EXCHANGE_COLORS, STATUS_COLORS } from '../AStockTag';

describe('AStockTag', () => {
  describe('交易所标签渲染', () => {
    it('应正确渲染 SH 标签', () => {
      render(<AStockTag exchange="SH" variant="exchange" />);
      expect(screen.getByText('SH')).toBeDefined();
    });

    it('应正确渲染 SZ 标签', () => {
      render(<AStockTag exchange="SZ" variant="exchange" />);
      expect(screen.getByText('SZ')).toBeDefined();
    });

    it('应正确渲染 BJ 标签', () => {
      render(<AStockTag exchange="BJ" variant="exchange" />);
      expect(screen.getByText('BJ')).toBeDefined();
    });

    it('SH 标签应有蓝色背景', () => {
      const { container } = render(<AStockTag exchange="SH" variant="exchange" />);
      expect(container.innerHTML).toContain('#1890FF');
    });

    it('SZ 标签应有橙色背景', () => {
      const { container } = render(<AStockTag exchange="SZ" variant="exchange" />);
      expect(container.innerHTML).toContain('#FA8C16');
    });

    it('BJ 标签应有绿色背景', () => {
      const { container } = render(<AStockTag exchange="BJ" variant="exchange" />);
      expect(container.innerHTML).toContain('#52C41A');
    });
  });

  describe('状态标签渲染', () => {
    it('应正确渲染正常状态', () => {
      render(<AStockTag exchange="SH" status="normal" variant="status" />);
      expect(screen.getByText('正常')).toBeDefined();
    });

    it('应正确渲染涨停状态', () => {
      render(<AStockTag exchange="SH" status="limit_up" variant="status" />);
      expect(screen.getByText('涨停')).toBeDefined();
    });

    it('应正确渲染跌停状态', () => {
      render(<AStockTag exchange="SH" status="limit_down" variant="status" />);
      expect(screen.getByText('跌停')).toBeDefined();
    });

    it('应正确渲染停牌状态', () => {
      render(<AStockTag exchange="SH" status="suspended" variant="status" />);
      expect(screen.getByText('停牌')).toBeDefined();
    });

    it('应正确渲染 ST 状态', () => {
      render(<AStockTag exchange="SH" status="st" variant="status" />);
      expect(screen.getByText('ST')).toBeDefined();
    });
  });

  describe('尺寸', () => {
    it('sm 尺寸应使用较小样式', () => {
      const { container } = render(<AStockTag exchange="SH" size="sm" />);
      expect(container.querySelector('.text-\\[10px\\]')).toBeDefined();
    });

    it('md 尺寸应使用默认样式', () => {
      const { container } = render(<AStockTag exchange="SH" size="md" />);
      expect(container.querySelector('.text-xs')).toBeDefined();
    });

    it('lg 尺寸应使用较大样式', () => {
      const { container } = render(<AStockTag exchange="SH" size="lg" />);
      expect(container.querySelector('.text-sm')).toBeDefined();
    });
  });

  describe('无障碍性', () => {
    it('交易所标签应有正确的 aria-label', () => {
      render(<AStockTag exchange="SH" variant="exchange" />);
      const tag = screen.getByText('SH');
      expect(tag.getAttribute('aria-label')).toBe('交易所: SH');
    });

    it('状态标签应有正确的 role', () => {
      render(<AStockTag exchange="SH" status="normal" variant="status" />);
      const tag = screen.getByText('正常');
      expect(tag.getAttribute('role')).toBe('status');
    });
  });

  describe('禁用状态', () => {
    it('禁用时应添加 opacity-50', () => {
      const { container } = render(<AStockTag exchange="SH" disabled />);
      expect(container.querySelector('.opacity-50')).toBeDefined();
    });

    it('禁用时应添加 cursor-not-allowed', () => {
      const { container } = render(<AStockTag exchange="SH" disabled />);
      expect(container.querySelector('.cursor-not-allowed')).toBeDefined();
    });
  });
});

describe('ExchangeSelector', () => {
  describe('基本渲染', () => {
    it('应显示所有交易所选项', () => {
      render(<ExchangeSelector value="SH" onChange={() => {}} />);

      expect(screen.getByText('SH')).toBeDefined();
      expect(screen.getByText('SZ')).toBeDefined();
      expect(screen.getByText('BJ')).toBeDefined();
    });

    it('当前选中的选项应有激活样式', () => {
      const { container } = render(<ExchangeSelector value="SZ" onChange={() => {}} />);

      // SZ 按钮应有激活状态
      const buttons = container.querySelectorAll('button');
      expect(buttons[1].getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('交互', () => {
    it('点击选项应触发 onChange', () => {
      const onChange = vi.fn();
      render(<ExchangeSelector value="SH" onChange={onChange} />);

      const szButton = screen.getByText('SZ');
      fireEvent.click(szButton);

      expect(onChange).toHaveBeenCalledWith('SZ');
    });

    it('禁用时点击不应触发 onChange', () => {
      const onChange = vi.fn();
      render(<ExchangeSelector value="SH" onChange={onChange} disabled />);

      const szButton = screen.getByText('SZ');
      fireEvent.click(szButton);

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('无障碍性', () => {
    it('应有 radiogroup 角色', () => {
      const { container } = render(<ExchangeSelector value="SH" onChange={() => {}} />);
      expect(container.querySelector('[role="radiogroup"]')).toBeDefined();
    });

    it('选项应有 radio 角色', () => {
      render(<ExchangeSelector value="SH" onChange={() => {}} />);

      const shButton = screen.getByText('SH');
      expect(shButton.getAttribute('role')).toBe('radio');
    });
  });
});

describe('createExchangeTag', () => {
  it('应创建自定义交易所标签组件', () => {
    const SHTag = createExchangeTag('SH');
    const { container } = render(<SHTag size="sm" />);

    expect(screen.getByText('SH')).toBeDefined();
    expect(container.innerHTML).toContain('#1890FF');
  });

  it('创建的不同交易所应有不同颜色', () => {
    const SHTag = createExchangeTag('SH');
    const SZTag = createExchangeTag('SZ');

    const { container: shContainer } = render(<SHTag />);
    const { container: szContainer } = render(<SZTag />);

    expect(shContainer.innerHTML).not.toEqual(szContainer.innerHTML);
  });
});

describe('颜色常量', () => {
  describe('EXCHANGE_COLORS', () => {
    it('应包含 SH 颜色配置', () => {
      expect(EXCHANGE_COLORS.SH).toBeDefined();
      expect(EXCHANGE_COLORS.SH.bg).toBe('bg-[#1890FF]');
    });

    it('应包含 SZ 颜色配置', () => {
      expect(EXCHANGE_COLORS.SZ).toBeDefined();
      expect(EXCHANGE_COLORS.SZ.bg).toBe('bg-[#FA8C16]');
    });

    it('应包含 BJ 颜色配置', () => {
      expect(EXCHANGE_COLORS.BJ).toBeDefined();
      expect(EXCHANGE_COLORS.BJ.bg).toBe('bg-[#52C41A]');
    });
  });

  describe('STATUS_COLORS', () => {
    it('应包含所有状态颜色配置', () => {
      expect(STATUS_COLORS.normal).toBeDefined();
      expect(STATUS_COLORS.limit_up).toBeDefined();
      expect(STATUS_COLORS.limit_down).toBeDefined();
      expect(STATUS_COLORS.suspended).toBeDefined();
      expect(STATUS_COLORS.st).toBeDefined();
    });

    it('涨停应为红色', () => {
      expect(STATUS_COLORS.limit_up.bg).toBe('bg-red-100');
    });

    it('跌停应为绿色', () => {
      expect(STATUS_COLORS.limit_down.bg).toBe('bg-green-100');
    });

    it('ST 应为紫色', () => {
      expect(STATUS_COLORS.st.bg).toBe('bg-purple-100');
    });
  });
});
