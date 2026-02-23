/**
 * ASectorPanel 组件测试
 *
 * 测试板块面板组件的渲染和交互功能
 * @module components/astock/__tests__/ASectorPanel.test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ASectorPanel from '../ASectorPanel';

// Mock utils
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    formatWanAmount: (amount: number) => {
      if (Math.abs(amount) >= 10000) {
        return `${(amount / 10000).toFixed(2)}万`;
      }
      return `${amount.toFixed(0)}万`;
    },
  };
});

// Mock TradingCalendar
vi.mock('@/lib/data-sources/astock/trading-calendar', () => ({
  TradingCalendar: {
    getTradingStatus: () => ({
      status: 'CLOSED',
      session: undefined,
      note: '市场休市',
    }),
  },
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  },
}));

describe('ASectorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基础渲染', () => {
    it('应该渲染行业板块面板', () => {
      render(<ASectorPanel type="industry" limit={10} />);

      expect(screen.getByTestId('panel-title')).toHaveTextContent(/行业板块/);
      expect(screen.getByTestId('ranking-type-hot')).toHaveTextContent('热门');
    });

    it('应该渲染概念板块面板', () => {
      render(<ASectorPanel type="concept" limit={10} />);

      expect(screen.getByTestId('panel-title')).toHaveTextContent(/概念板块/);
      expect(screen.getByTestId('ranking-type-hot')).toHaveTextContent('热门');
    });

    it('应该应用自定义 className', () => {
      const { container } = render(
        <ASectorPanel type="industry" className="custom-class" />
      );

      const panel = container.firstChild as HTMLElement;
      expect(panel.className).toContain('custom-class');
    });
  });

  describe('排行榜类型切换', () => {
    it('应该默认显示热门板块', () => {
      render(<ASectorPanel type="industry" limit={10} />);

      expect(screen.getByTestId('panel-title')).toHaveTextContent(/行业板块 热门/);
    });

    it('应该切换到冷门板块', async () => {
      render(<ASectorPanel type="industry" limit={10} />);

      const coldButton = screen.getByTestId('ranking-type-cold');
      fireEvent.click(coldButton);

      await waitFor(() => {
        expect(screen.getByTestId('panel-title')).toHaveTextContent(/行业板块 冷门/);
      });
    });

    it('应该切换到全部板块', async () => {
      render(<ASectorPanel type="industry" limit={10} />);

      const allButton = screen.getByTestId('ranking-type-all');
      fireEvent.click(allButton);

      await waitFor(() => {
        expect(screen.getByTestId('panel-title')).toHaveTextContent(/行业板块 全部/);
      });
    });
  });

  describe('板块数据渲染', () => {
    it('应该显示板块列表', async () => {
      render(<ASectorPanel type="industry" limit={5} />);

      await waitFor(() => {
        expect(screen.getByText('农林牧渔')).toBeDefined();
        expect(screen.getByText('801010.SH')).toBeDefined();
      });
    });

    it('应该显示涨跌幅信息', async () => {
      render(<ASectorPanel type="industry" limit={5} />);

      await waitFor(() => {
        expect(screen.getByText(/\+3.25%/)).toBeDefined();
        expect(screen.getByText(/\+2.88%/)).toBeDefined();
      });
    });

    it('应该显示资金流向信息', async () => {
      render(<ASectorPanel type="industry" limit={5} />);

      await waitFor(() => {
        expect(screen.getByText(/2\.50亿/)).toBeDefined();
        expect(screen.getByText(/1\.80亿/)).toBeDefined();
      });
    });

    it('应该显示排名徽章', async () => {
      const { container } = render(<ASectorPanel type="industry" limit={5} />);

      await waitFor(() => {
        const badges = container.querySelectorAll('div[class*="rounded-full"]');
        expect(badges.length).toBeGreaterThan(0);

        // 检查第一名徽章颜色
        expect(badges[0].className).toContain('bg-yellow-500/20');
      });
    });
  });

  describe('A股颜色约定', () => {
    it('应该正确显示上涨颜色（红色）', async () => {
      render(<ASectorPanel type="industry" limit={5} />);

      await waitFor(() => {
        const changeText = screen.getByText(/\+3\.25%/);
        const parentDiv = changeText.closest('div');
        expect(parentDiv?.className).toContain('text-red-400');
      });
    });

    it('应该正确显示下跌颜色（绿色）', async () => {
      render(<ASectorPanel type="industry" limit={10} />);

      // 切换到冷门板块
      const coldButton = screen.getByTestId('ranking-type-cold');
      fireEvent.click(coldButton);

      await waitFor(() => {
        const changeText = screen.getByText(/-3\.25%/);
        const parentDiv = changeText.closest('div');
        expect(parentDiv?.className).toContain('text-green-400');
      });
    });
  });

  describe('交互功能', () => {
    it('应该支持刷新数据', async () => {
      render(<ASectorPanel type="industry" limit={5} />);

      await waitFor(() => {
        expect(screen.getByText('农林牧渔')).toBeDefined();
      });

      const refreshButton = screen.getByTestId('refresh-button');
      expect(refreshButton).toBeDefined();
      fireEvent.click(refreshButton);
    });

    it('板块项应该是可点击的链接', async () => {
      render(<ASectorPanel type="industry" limit={5} />);

      await waitFor(() => {
        const link = screen.getByText('农林牧渔').closest('a');
        expect(link?.getAttribute('href')).toBe('/sectors/801010.SH');
      });
    });
  });

  describe('加载状态', () => {
    it('应该显示加载状态', async () => {
      render(<ASectorPanel type="industry" limit={5} />);

      // 等待数据加载完成
      await waitFor(() => {
        expect(screen.getByText('农林牧渔')).toBeDefined();
      });

      // 加载完成后不应该显示加载中
      expect(screen.queryByText(/加载中.../)).not.toBeInTheDocument();
    });
  });

  describe('Props 更新', () => {
    it('应该在 type 变化时重新获取数据', async () => {
      const { rerender } = render(<ASectorPanel type="industry" limit={5} />);

      await waitFor(() => {
        expect(screen.getByTestId('panel-title')).toHaveTextContent(/行业板块/);
      }, { timeout: 3000 });

      rerender(<ASectorPanel type="concept" limit={5} />);

      await waitFor(() => {
        expect(screen.getByTestId('panel-title')).toHaveTextContent(/概念板块/);
      }, { timeout: 3000 });
    });

    it('应该在 limit 变化时调整显示数量', async () => {
      const { rerender } = render(<ASectorPanel type="industry" limit={5} />);

      await waitFor(() => {
        expect(screen.getByTestId('panel-title')).toHaveTextContent(/行业板块/);
      }, { timeout: 3000 });

      rerender(<ASectorPanel type="industry" limit={15} />);

      // 应该显示更多板块
      await waitFor(() => {
        const links = screen.getAllByRole('link');
        expect(links.length).toBeGreaterThan(5);
      }, { timeout: 3000 });
    });
  });

  describe('可访问性', () => {
    it('刷新按钮应该有正确的 aria-label', () => {
      render(<ASectorPanel type="industry" limit={5} />);

      const refreshButton = screen.getByLabelText(/刷新数据/);
      expect(refreshButton).toBeDefined();
    });

    it('板块类型选择器按钮应该是可访问的', () => {
      render(<ASectorPanel type="industry" limit={5} />);

      expect(screen.getByTestId('ranking-type-hot')).toBeDefined();
      expect(screen.getByTestId('ranking-type-cold')).toBeDefined();
      expect(screen.getByTestId('ranking-type-all')).toBeDefined();
    });
  });

  describe('概念板块', () => {
    it('应该显示概念板块数据', async () => {
      render(<ASectorPanel type="concept" limit={5} />);

      await waitFor(() => {
        expect(screen.getByText('新能源汽车')).toBeDefined();
        expect(screen.getByText('TS001')).toBeDefined();
      });
    });

    it('概念板块应该显示正确的涨跌幅', async () => {
      render(<ASectorPanel type="concept" limit={5} />);

      await waitFor(() => {
        expect(screen.getByText(/\+4.25%/)).toBeDefined();
      });
    });
  });
});
