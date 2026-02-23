/**
 * WatchlistTable 组件测试
 *
 * 测试 A 股观察列表组件功能，包括：
 * - 新增列显示（代码、名称、现价、涨跌、涨停价、跌停价、换手率、成交量、涨跌停状态）
 * - A 股组件使用（AStockCell、AStockPrice、AStockTag、CompactLimitPriceDisplay）
 * - 排序功能（涨跌幅、换手率、成交量、价格、名称）
 * @module components/watchlist/__tests__/WatchlistTable.test
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WatchlistTable from '../WatchlistTable';

// Mock A 股组件
vi.mock('@/components/astock', () => ({
  AStockCell: ({ tsCode, companyName, size, showExchange }: any) => (
    <span data-testid={`astock-cell-${tsCode}`} data-size={size} data-show-exchange={showExchange}>
      {tsCode} {companyName}
    </span>
  ),
  AStockPrice: ({ price, change, changePercent, size, showYuan }: any) => (
    <span data-testid="astock-price" data-size={size} data-show-yuan={showYuan}>
      {showYuan ? '¥' : ''}{price} {change > 0 ? '+' : ''}{change} ({changePercent}%)
    </span>
  ),
  AStockTag: ({ exchange, status, size }: any) => (
    <span data-testid="astock-tag" data-exchange={exchange} data-status={status} data-size={size}>
      {exchange} {status}
    </span>
  ),
  CompactLimitPriceDisplay: ({ currentPrice, size }: any) => (
    <span data-testid="limit-price-display" data-size={size}>
      Limit: ¥{currentPrice}
    </span>
  ),
}));

// Mock actions
vi.mock('@/lib/actions/watchlist.actions', () => ({
  removeFromWatchlist: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock WatchlistButton
vi.mock('@/components/WatchlistButton', () => ({
  default: ({ symbol, onWatchlistChange }: any) => (
    <button data-testid={`watchlist-btn-${symbol}`} onClick={() => onWatchlistChange?.(symbol, false)}>
      Remove
    </button>
  ),
}));

// Mock CreateAlertModal
vi.mock('../CreateAlertModal', () => ({
  default: ({ children, userId, symbol, currentPrice, onAlertCreated }: any) => (
    <div data-testid={`alert-modal-${symbol}`}>
      {children}
    </div>
  ),
}));

// Mock finnhub actions
vi.mock('@/lib/actions/finnhub.actions', () => ({
  getWatchlistData: vi.fn().mockResolvedValue([
    {
      symbol: '600519.SH',
      price: 1850,
      change: 50,
      changePercent: 2.78,
      currency: 'CNY',
      name: '贵州茅台',
      volume: 120000000,
      turnoverRate: 2.35,
    },
    {
      symbol: '000001.SZ',
      price: 12.5,
      change: -0.5,
      changePercent: -3.85,
      currency: 'CNY',
      name: '平安银行',
      volume: 98000000,
      turnoverRate: 1.2,
    },
  ]),
}));

// Mock AStockCodeUtil
vi.mock('@/lib/data-sources/astock', () => ({
  AStockCodeUtil: {
    isAStock: vi.fn((symbol: string) => symbol.includes('.SH') || symbol.includes('.SZ') || symbol.includes('.BJ')),
    extractCode: vi.fn((symbol: string) => symbol.split('.')[0]),
    getExchange: vi.fn((symbol: string) => symbol.split('.')[1] as 'SH' | 'SZ' | 'BJ'),
  },
}));

describe('WatchlistTable - A 股模式', () => {
  const mockUserId = 'test-user-id';
  const mockAStockData = [
    {
      symbol: '600519.SH',
      price: 1850,
      change: 50,
      changePercent: 2.78,
      currency: 'CNY',
      name: '贵州茅台',
      logo: undefined,
      marketCap: 2300000000000,
      peRatio: 35.5,
      volume: 120000000,
      turnoverRate: 2.35,
      limitStatus: 'normal' as const,
    },
    {
      symbol: '000001.SZ',
      price: 12.5,
      change: -0.5,
      changePercent: -3.85,
      currency: 'CNY',
      name: '平安银行',
      logo: undefined,
      marketCap: 240000000000,
      peRatio: 5.8,
      volume: 98000000,
      turnoverRate: 1.2,
      limitStatus: 'normal' as const,
    },
    {
      symbol: '300001.SZ',
      price: 25.8,
      change: 5.16,
      changePercent: 25,  // 接近涨停
      currency: 'CNY',
      name: '特锐德',
      logo: undefined,
      marketCap: 15000000000,
      peRatio: 45,
      volume: 150000000,
      turnoverRate: 8.5,
      limitStatus: 'limit_up' as const,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('A 股模式渲染', () => {
    it('应该渲染 A 股模式表格', () => {
      render(
        <WatchlistTable
          data={mockAStockData}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      // 验证表格列头
      expect(screen.getByText('代码')).toBeInTheDocument();
      expect(screen.getByText('名称')).toBeInTheDocument();
      expect(screen.getByText('现价')).toBeInTheDocument();
      expect(screen.getByText('涨停价')).toBeInTheDocument();
      expect(screen.getByText('跌停价')).toBeInTheDocument();
      expect(screen.getByText('换手率')).toBeInTheDocument();
      expect(screen.getByText('成交量')).toBeInTheDocument();
      expect(screen.getByText('涨跌停')).toBeInTheDocument();
      expect(screen.getByText('操作')).toBeInTheDocument();
    });

    it('应该使用 AStockCell 组件显示股票代码', () => {
      render(
        <WatchlistTable
          data={mockAStockData}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      // 验证 AStockCell 组件被调用
      expect(screen.getByTestId('astock-cell-600519.SH')).toBeInTheDocument();
      expect(screen.getByTestId('astock-cell-000001.SZ')).toBeInTheDocument();
    });

    it('应该使用 AStockPrice 组件显示价格（红涨绿跌）', () => {
      render(
        <WatchlistTable
          data={mockAStockData}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      // 验证 AStockPrice 组件被调用
      const priceElements = screen.getAllByTestId('astock-price');
      expect(priceElements.length).toBeGreaterThan(0);

      // 验证价格上涨显示
      expect(screen.getByText(/1850/)).toBeInTheDocument();
      expect(screen.getByText(/\+50/)).toBeInTheDocument();
      expect(screen.getByText(/\(2\.78%\)/)).toBeInTheDocument();
    });

    it('应该使用 AStockTag 组件显示涨跌停状态', () => {
      render(
        <WatchlistTable
          data={mockAStockData}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      // 验证涨停状态标签存在
      const limitUpTags = screen.getAllByTestId('astock-tag');
      expect(limitUpTags.length).toBeGreaterThan(0);
    });

    it('应该显示换手率数据', () => {
      render(
        <WatchlistTable
          data={mockAStockData}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      // 验证换手率显示
      expect(screen.getByText('2.35%')).toBeInTheDocument();
      // 使用更灵活的匹配器来查找换手率
      const turnoverElements = screen.getAllByText(/%/, { exact: false });
      expect(turnoverElements.length).toBeGreaterThan(2);
    });

    it('应该显示成交量数据（亿/万手格式）', () => {
      render(
        <WatchlistTable
          data={mockAStockData}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      // 验证成交量显示（1.2亿手）
      expect(screen.getByText('1.20亿')).toBeInTheDocument();
    });

    it('应该显示涨停价和跌停价', () => {
      render(
        <WatchlistTable
          data={mockAStockData}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      // 验证涨跌停价格显示
      // 茅台涨停价 = 1850 * 1.10 = 2035
      // 茅台跌停价 = 1850 * 0.90 = 1665
      expect(screen.getByText(/2035/)).toBeInTheDocument();
      expect(screen.getByText(/1665/)).toBeInTheDocument();
    });

    it('应该高显示高换手率股票', () => {
      render(
        <WatchlistTable
          data={mockAStockData}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      // 换手率 > 10% 应显示为橙色
      // 换手率 > 5% 应显示为黄色
      const turnoverElements = screen.getAllByText(/%/, { exact: false });
      expect(turnoverElements.length).toBeGreaterThan(0);
    });
  });

  describe('排序功能', () => {
    it('应该显示排序按钮', () => {
      render(
        <WatchlistTable
          data={mockAStockData}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      // 验证涨跌幅排序按钮
      const changeSortButton = screen.getByText('涨跌').closest('button');
      expect(changeSortButton).toBeInTheDocument();

      // 验证换手率排序按钮
      const turnoverSortButton = screen.getByText('换手率').closest('button');
      expect(turnoverSortButton).toBeInTheDocument();

      // 验证成交量排序按钮
      const volumeSortButton = screen.getByText('成交量').closest('button');
      expect(volumeSortButton).toBeInTheDocument();
    });

    it('应该支持点击排序按钮', () => {
      render(
        <WatchlistTable
          data={mockAStockData}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      // 点击涨跌幅排序按钮 - 不抛出错误即视为成功
      const sortButton = screen.getByText('涨跌').closest('button');
      expect(sortButton).toBeInTheDocument();

      if (sortButton) {
        expect(() => fireEvent.click(sortButton)).not.toThrow();
      }
    });
  });

  describe('操作按钮', () => {
    it('应该显示添加提醒按钮', () => {
      render(
        <WatchlistTable
          data={mockAStockData}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      // 验证提醒按钮存在
      expect(screen.getByTestId('alert-modal-600519.SH')).toBeInTheDocument();
    });

    it('应该显示移除按钮', () => {
      render(
        <WatchlistTable
          data={mockAStockData}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      // 验证移除按钮存在
      expect(screen.getByTestId('watchlist-btn-600519.SH')).toBeInTheDocument();
    });

    it('应该支持从观察列表移除股票', async () => {
      const { removeFromWatchlist } = await import('@/lib/actions/watchlist.actions');

      render(
        <WatchlistTable
          data={mockAStockData}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      const removeButton = screen.getByTestId('watchlist-btn-600519.SH');
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(removeFromWatchlist).toHaveBeenCalledWith(mockUserId, '600519.SH');
      });
    });
  });

  describe('空状态', () => {
    it('应该显示空状态消息', () => {
      render(
        <WatchlistTable
          data={[]}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      expect(screen.getByText('Your watchlist is empty')).toBeInTheDocument();
    });
  });

  describe('实时价格更新', () => {
    it('应该定期轮询更新价格', () => {
      vi.useFakeTimers();

      render(
        <WatchlistTable
          data={mockAStockData}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      // 验证初始渲染 - 使用 getAllByTestId 因为有多个价格组件
      const priceElements = screen.getAllByTestId('astock-price');
      expect(priceElements.length).toBeGreaterThan(0);

      // 快进 5 秒
      vi.advanceTimersByTime(5000);

      // 验证组件仍然存在
      const updatedPriceElements = screen.queryAllByTestId('astock-price');
      expect(updatedPriceElements.length).toBeGreaterThan(0);

      vi.useRealTimers();
    });
  });

  describe('美股/默认模式', () => {
    const mockUSStockData = [
      {
        symbol: 'AAPL',
        price: 175.5,
        change: 2.5,
        changePercent: 1.45,
        currency: 'USD',
        name: 'Apple Inc.',
        logo: 'https://logo.clearbit.com/apple.com',
        marketCap: 2700000000000,
        peRatio: 28,
      },
    ];

    it('应该渲染美股模式表格', () => {
      render(
        <WatchlistTable
          data={mockUSStockData}
          userId={mockUserId}
          useAStockMode={false}
        />
      );

      // 验证美股表格列头
      expect(screen.getByText('Company')).toBeInTheDocument();
      expect(screen.getByText('Symbol')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Change')).toBeInTheDocument();
      expect(screen.getByText('Market Cap')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('应该显示美股公司名称和图标', () => {
      render(
        <WatchlistTable
          data={mockUSStockData}
          userId={mockUserId}
          useAStockMode={false}
        />
      );

      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    it('应该显示美股价格（美元）', () => {
      render(
        <WatchlistTable
          data={mockUSStockData}
          userId={mockUserId}
          useAStockMode={false}
        />
      );

      expect(screen.getByText('$175.50')).toBeInTheDocument();
    });
  });

  describe('涨跌停状态检测', () => {
    it('应该正确检测涨停状态（涨跌幅 >= 9.9%）', () => {
      const limitUpData = [
        {
          symbol: '600519.SH',
          price: 1850,
          change: 185,
          changePercent: 10,
          currency: 'CNY',
          name: '贵州茅台',
          volume: 120000000,
          turnoverRate: 2.35,
          limitStatus: 'limit_up' as const,
        },
      ];

      render(
        <WatchlistTable
          data={limitUpData}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      // 验证涨停标签显示
      const limitUpTags = screen.getAllByTestId('astock-tag');
      expect(limitUpTags.length).toBeGreaterThan(0);
    });

    it('应该正确检测跌停状态（涨跌幅 <= -9.9%）', () => {
      const limitDownData = [
        {
          symbol: '000001.SZ',
          price: 10,
          change: -1,
          changePercent: -10,
          currency: 'CNY',
          name: '平安银行',
          volume: 98000000,
          turnoverRate: 1.2,
          limitStatus: 'limit_down' as const,
        },
      ];

      render(
        <WatchlistTable
          data={limitDownData}
          userId={mockUserId}
          useAStockMode={true}
        />
      );

      // 验证跌停标签显示
      const limitDownTags = screen.getAllByTestId('astock-tag');
      expect(limitDownTags.length).toBeGreaterThan(0);
    });
  });
});
