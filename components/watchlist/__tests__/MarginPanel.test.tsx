/**
 * MarginPanel 组件测试
 *
 * 测试融资融券面板组件的基本功能
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MarginPanel from '../MarginPanel';

// Mock Server Actions
vi.mock('@/lib/actions/margin.actions', () => ({
  getMarginData: vi.fn(),
  getMarginTrend: vi.fn(),
  analyzeSentiment: vi.fn(),
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  formatWanAmount: vi.fn((amount: number) => {
    if (amount === 0) return '0';
    if (Math.abs(amount) < 10000) return amount.toFixed(2);
    return (amount / 10000).toFixed(2) + '万';
  }),
  formatDateToMM_DD: vi.fn((dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) return dateStr.substring(5);
    if (dateStr.length === 8) return `${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    return dateStr;
  }),
}));

import { getMarginData, getMarginTrend, analyzeSentiment } from '@/lib/actions/margin.actions';

describe('MarginPanel 组件', () => {
  const mockSymbol = '600519.SH';
  const mockMarginData = {
    tsCode: '600519.SH',
    tradeDate: '2026-02-20',
    marginBalance: 1234567.89,
    marginBuy: 12345.67,
    marginRepay: 10234.56,
    shortBalance: 12345.67,
    shortSell: 123,
    shortCover: 98,
    marginRatio: 100.5,
  };

  const mockTrendData = [
    {
      ...mockMarginData,
      tradeDate: '2026-02-20',
      marginBalance: 1250000,
    },
    {
      ...mockMarginData,
      tradeDate: '2026-02-19',
      marginBalance: 1230000,
    },
    {
      ...mockMarginData,
      tradeDate: '2026-02-18',
      marginBalance: 1220000,
    },
    {
      ...mockMarginData,
      tradeDate: '2026-02-17',
      marginBalance: 1210000,
    },
    {
      ...mockMarginData,
      tradeDate: '2026-02-16',
      marginBalance: 1200000,
    },
  ];

  const mockTrendAnalysis = {
    marginBalanceChange: 50000,
    marginBalanceChangeRate: 4.17,
    shortBalanceChange: 1234.56,
    shortBalanceChangeRate: 10.0,
    marginRatioChange: 0.5,
    sentiment: 'bullish' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // 默认成功响应
    (getMarginData as any).mockResolvedValue({
      success: true,
      data: mockMarginData,
    });
    (getMarginTrend as any).mockResolvedValue({
      success: true,
      data: mockTrendData,
      trend: mockTrendAnalysis,
    });
    (analyzeSentiment as any).mockResolvedValue({
      success: true,
      data: {
        sentiment: 'bullish' as const,
        confidence: 75,
        reasons: ['融资余额增加 4.17%', '融资融券比上升 0.5'],
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本渲染', () => {
    it('应该渲染标题和刷新按钮', () => {
      render(<MarginPanel symbol={mockSymbol} />);
      expect(screen.getByText('融资融券')).toBeInTheDocument();
    });

    it('应该显示加载状态', () => {
      render(<MarginPanel symbol={mockSymbol} />);
      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });
  });

  describe('数据显示', () => {
    it('应该显示融资余额和融券余额', async () => {
      render(<MarginPanel symbol={mockSymbol} />);

      await waitFor(() => {
        expect(screen.getByText('融资余额(万)')).toBeInTheDocument();
        expect(screen.getByText('融券余额(万)')).toBeInTheDocument();
      });
    });

    it('应该显示融资买入/偿还数据', async () => {
      render(<MarginPanel symbol={mockSymbol} />);

      await waitFor(() => {
        expect(screen.getByText('融资买入')).toBeInTheDocument();
        expect(screen.getByText('融资偿还')).toBeInTheDocument();
      });
    });

    it('应该显示融券卖出/偿还数据', async () => {
      render(<MarginPanel symbol={mockSymbol} />);

      await waitFor(() => {
        expect(screen.getByText('融券卖出')).toBeInTheDocument();
        expect(screen.getByText('融券偿还')).toBeInTheDocument();
      });
    });

    it('应该显示多空情绪指示器', async () => {
      render(<MarginPanel symbol={mockSymbol} />);

      await waitFor(() => {
        // 使用 getAllByText 因为"看多"可能出现在多个地方
        expect(screen.getAllByText('看多').length).toBeGreaterThan(0);
        expect(screen.getByText(/信心度/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('错误处理', () => {
    it('应该显示错误状态', async () => {
      (getMarginData as any).mockResolvedValue({
        success: false,
        error: '获取数据失败',
      });
      (getMarginTrend as any).mockResolvedValue({
        success: false,
        data: undefined,
      });

      render(<MarginPanel symbol={mockSymbol} />);

      await waitFor(() => {
        expect(screen.getByText('获取数据失败')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该显示空数据状态', async () => {
      (getMarginData as any).mockResolvedValue({
        success: false,
        error: '暂无融资融券数据',
      });
      (getMarginTrend as any).mockResolvedValue({
        success: true,
        data: [],
      });

      render(<MarginPanel symbol={mockSymbol} />);

      await waitFor(() => {
        expect(screen.getByText('暂无融资融券数据')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('趋势图显示', () => {
    it('应该显示趋势图当 showTrend=true', async () => {
      render(<MarginPanel symbol={mockSymbol} showTrend={true} />);

      await waitFor(() => {
        expect(screen.getByText('融资余额趋势')).toBeInTheDocument();
      });
    });

    it('不应该显示趋势图当 showTrend=false', async () => {
      render(<MarginPanel symbol={mockSymbol} showTrend={false} />);

      await waitFor(() => {
        expect(screen.queryByText('融资余额趋势')).not.toBeInTheDocument();
      });
    });
  });

  describe('刷新功能', () => {
    it('点击刷新按钮应该重新获取数据', async () => {
      render(<MarginPanel symbol={mockSymbol} />);

      await waitFor(() => {
        expect(screen.getByText('融资余额(万)')).toBeInTheDocument();
      });

      const refreshButton = screen.getByTitle('刷新数据');
      refreshButton.click();

      expect(getMarginData).toHaveBeenCalledTimes(2);
    });

    it('加载中时刷新按钮应该禁用', async () => {
      render(<MarginPanel symbol={mockSymbol} />);

      const refreshButton = screen.getByTitle('加载中...');
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('缓存标识', () => {
    it('应该显示缓存标识当数据来自缓存', async () => {
      (getMarginData as any).mockResolvedValue({
        success: true,
        data: mockMarginData,
        cached: true,
      });

      render(<MarginPanel symbol={mockSymbol} />);

      await waitFor(() => {
        expect(screen.getByText('缓存数据')).toBeInTheDocument();
      });
    });

    it('不应该显示缓存标识当数据不是来自缓存', async () => {
      (getMarginData as any).mockResolvedValue({
        success: true,
        data: mockMarginData,
        cached: false,
      });

      render(<MarginPanel symbol={mockSymbol} />);

      await waitFor(() => {
        expect(screen.queryByText('缓存数据')).not.toBeInTheDocument();
      });
    });
  });

  describe('数据来源', () => {
    it('应该显示数据来源和交易日期', async () => {
      render(<MarginPanel symbol={mockSymbol} />);

      await waitFor(() => {
        expect(screen.getByText(/数据来源：Tushare/)).toBeInTheDocument();
        expect(screen.getByText(/交易日期：2026-02-20/)).toBeInTheDocument();
      });
    });
  });

  describe('颜色编码（A股红涨绿跌）', () => {
    it('融资余额增加应该显示红色', async () => {
      render(<MarginPanel symbol={mockSymbol} />);

      await waitFor(() => {
        const changeElement = screen.getByText(/融资余额变化/).nextElementSibling;
        expect(changeElement).toHaveClass('text-red-400');
      });
    });

    it('融券余额增加应该显示绿色（做空）', async () => {
      render(<MarginPanel symbol={mockSymbol} />);

      await waitFor(() => {
        const changeElement = screen.getByText(/融券余额变化/).nextElementSibling;
        expect(changeElement).toHaveClass('text-green-400');
      });
    });
  });

  describe('响应式设计', () => {
    it('应该在移动端正常显示', async () => {
      // 模拟移动端视口
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<MarginPanel symbol={mockSymbol} />);

      await waitFor(() => {
        expect(screen.getByText('融资融券')).toBeInTheDocument();
      });
    });
  });
});
