import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TopListPanel from '../TopListPanel';
import * as toplistActions from '@/lib/actions/toplist.actions';

// Mock Server Actions
vi.mock('@/lib/actions/toplist.actions', () => ({
  getTopListData: vi.fn(),
}));

vi.mock('@/lib/utils', () => ({
  formatWanAmount: vi.fn((value: number) => value.toLocaleString()),
}));

const mockTopListData = [
  {
    tsCode: '600519.SH',
    name: '贵州茅台',
    reason: '机构买入',
    buyAmount: 50000,
    sellAmount: 20000,
    netAmount: 30000,
    rank: 1,
    tradeDate: '2026-02-21',
  },
  {
    tsCode: '000858.SZ',
    name: '五粮液',
    reason: '大单买入',
    buyAmount: 30000,
    sellAmount: 35000,
    netAmount: -5000,
    rank: 2,
    tradeDate: '2026-02-21',
  },
];

describe('TopListPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading state initially', () => {
    // Setup mock to return pending promise
    vi.mocked(toplistActions.getTopListData).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<TopListPanel />);

    expect(screen.getByText('加载中...')).toBeDefined();
  });

  it('should render error state when API fails', async () => {
    vi.mocked(toplistActions.getTopListData).mockResolvedValue({
      success: false,
      data: [],
      error: 'API Error: Network failed',
    });

    render(<TopListPanel />);

    await waitFor(() => {
      expect(screen.getByText('API Error: Network failed')).toBeDefined();
    });
  });

  it('should render empty state when no data', async () => {
    vi.mocked(toplistActions.getTopListData).mockResolvedValue({
      success: true,
      data: [],
      error: undefined,
    });

    render(<TopListPanel />);

    await waitFor(() => {
      expect(screen.getByText('暂无龙虎榜数据')).toBeDefined();
    });
  });

  it('should render data table with correct values', async () => {
    vi.mocked(toplistActions.getTopListData).mockResolvedValue({
      success: true,
      data: mockTopListData,
      error: undefined,
    });

    render(<TopListPanel limit={10} />);

    await waitFor(() => {
      // Check stock names
      expect(screen.getByText('贵州茅台')).toBeDefined();
      expect(screen.getByText('五粮液')).toBeDefined();

      // Check stock codes
      expect(screen.getByText('600519.SH')).toBeDefined();
      expect(screen.getByText('000858.SZ')).toBeDefined();
    });
  });

  it('should display net inflow in red and outflow in green', async () => {
    vi.mocked(toplistActions.getTopListData).mockResolvedValue({
      success: true,
      data: mockTopListData,
      error: undefined,
    });

    render(<TopListPanel />);

    await waitFor(() => {
      // Net inflow (positive) should have red-400 class
      const positiveRow = screen.getByText('贵州茅台').closest('tr');
      expect(positiveRow?.innerHTML).toContain('text-red-400');

      // Net outflow (negative) should have green-400 class
      const negativeRow = screen.getByText('五粮液').closest('tr');
      expect(negativeRow?.innerHTML).toContain('text-green-400');
    });
  });

  it('should handle refresh button click', async () => {
    vi.mocked(toplistActions.getTopListData).mockResolvedValue({
      success: true,
      data: mockTopListData,
      error: undefined,
    });

    render(<TopListPanel />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('贵州茅台')).toBeDefined();
    });

    // Click refresh button
    const refreshButton = screen.getByLabelText('刷新数据');
    fireEvent.click(refreshButton);

    // getTopListData should be called again
    expect(toplistActions.getTopListData).toHaveBeenCalledTimes(2);
  });

  it('should disable refresh button during loading', () => {
    vi.mocked(toplistActions.getTopListData).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<TopListPanel />);

    const refreshButton = screen.getByLabelText('正在加载');
    expect(refreshButton).toBeDefined();
    expect(refreshButton.hasAttribute('disabled')).toBe(true);
  });

  it('should show correct title for single stock', async () => {
    vi.mocked(toplistActions.getTopListData).mockResolvedValue({
      success: true,
      data: mockTopListData,
      error: undefined,
    });

    render(<TopListPanel symbol="600519.SH" />);

    await waitFor(() => {
      expect(screen.getByText('600519.SH 龙虎榜')).toBeDefined();
    });
  });

  it('should show default title for market overview', async () => {
    vi.mocked(toplistActions.getTopListData).mockResolvedValue({
      success: true,
      data: mockTopListData,
      error: undefined,
    });

    render(<TopListPanel />);

    await waitFor(() => {
      expect(screen.getByText('龙虎榜 TOP10')).toBeDefined();
    });
  });

  it('should display trade date in footer', async () => {
    vi.mocked(toplistActions.getTopListData).mockResolvedValue({
      success: true,
      data: mockTopListData,
      error: undefined,
    });

    render(<TopListPanel />);

    await waitFor(() => {
      expect(screen.getByText(/交易日期：2026-02-21/)).toBeDefined();
    });
  });

  it('should handle retry on error state', async () => {
    vi.mocked(toplistActions.getTopListData)
      .mockResolvedValueOnce({
        success: false,
        data: [],
        error: 'Initial error',
      })
      .mockResolvedValueOnce({
        success: true,
        data: mockTopListData,
        error: undefined,
      });

    render(<TopListPanel />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Initial error')).toBeDefined();
    });

    // Click retry button
    const retryButton = screen.getByText('重试');
    fireEvent.click(retryButton);

    // Should show data after retry
    await waitFor(() => {
      expect(screen.getByText('贵州茅台')).toBeDefined();
    });
  });

  it('should hide reason column when showReason is false', async () => {
    vi.mocked(toplistActions.getTopListData).mockResolvedValue({
      success: true,
      data: mockTopListData,
      error: undefined,
    });

    render(<TopListPanel showReason={false} />);

    await waitFor(() => {
      expect(screen.queryByText('机构买入')).toBeNull();
      expect(screen.queryByText('大单买入')).toBeNull();
    });
  });

  it('should pass symbol and limit to getTopListData', async () => {
    vi.mocked(toplistActions.getTopListData).mockResolvedValue({
      success: true,
      data: mockTopListData,
      error: undefined,
    });

    render(<TopListPanel symbol="600519.SH" limit={5} />);

    await waitFor(() => {
      expect(toplistActions.getTopListData).toHaveBeenCalledWith('600519.SH', 5);
    });
  });
});
