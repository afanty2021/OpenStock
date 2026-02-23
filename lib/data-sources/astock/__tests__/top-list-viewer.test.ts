/**
 * TopListViewer 单元测试
 *
 * 测试龙虎榜查看器功能
 * @module data-sources/astock/__tests__/top-list-viewer.test
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock 所有依赖模块
vi.mock('../../sources/tushare', () => ({
  TushareSource: vi.fn(),
}));

vi.mock('../trading-calendar', () => ({
  TradingCalendar: {
    isTradingDay: vi.fn(),
  },
}));

vi.mock('../trading-aware-scheduler', () => ({
  TradingAwareScheduler: {
    shouldRequest: vi.fn(),
    smartDelay: vi.fn().mockResolvedValue(undefined),
  },
}));

import { TopListViewer } from '../top-list-viewer';
import type { TopListData } from '../../sources/tushare';
import { TradingCalendar } from '../trading-calendar';
import { TradingAwareScheduler } from '../trading-aware-scheduler';

describe('TopListViewer', () => {
  let viewer: TopListViewer;
  let mockGetTopList: ReturnType<typeof vi.fn>;

  const mockTopListData: TopListData[] = [
    {
      ts_code: '600519.SH',
      name: '贵州茅台',
      reason: '日涨跌幅达偏离值达7%',
      buy_amount: 50000,
      sell_amount: 30000,
      net_amount: 20000,
    },
    {
      ts_code: '000001.SZ',
      name: '平安银行',
      reason: '日涨幅偏离值达7%',
      buy_amount: 40000,
      sell_amount: 20000,
      net_amount: 20000,
    },
    {
      ts_code: '688001.SH',
      name: '华兴源创',
      reason: '日换手率达30%',
      buy_amount: 30000,
      sell_amount: 25000,
      net_amount: 5000,
    },
    {
      ts_code: '300001.SZ',
      name: '特锐德',
      reason: '日跌幅偏离值达7%',
      buy_amount: 10000,
      sell_amount: 30000,
      net_amount: -20000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // 创建 mock TushareSource 实例
    mockGetTopList = vi.fn();
    const mockTushareSource = {
      getTopList: mockGetTopList,
    };

    viewer = new TopListViewer(mockTushareSource as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTodayTopList', () => {
    test('应返回当日龙虎榜数据，按净买入降序排序', async () => {
      vi.mocked(TradingAwareScheduler.shouldRequest).mockReturnValue(true);
      mockGetTopList.mockResolvedValue(mockTopListData);

      const result = await viewer.getTodayTopList();

      expect(result).toHaveLength(4);
      expect(mockGetTopList).toHaveBeenCalledWith();

      // 验证排序：净买入降序
      expect(result[0].tsCode).toBe('600519.SH');
      expect(result[0].netAmount).toBe(20000);
      expect(result[0].rank).toBe(1);
    });

    test('非交易时段应返回空数组', async () => {
      vi.mocked(TradingAwareScheduler.shouldRequest).mockReturnValue(false);

      const result = await viewer.getTodayTopList();

      expect(result).toEqual([]);
      expect(mockGetTopList).not.toHaveBeenCalled();
    });

    test('应正确转换数据格式', async () => {
      vi.mocked(TradingAwareScheduler.shouldRequest).mockReturnValue(true);
      mockGetTopList.mockResolvedValue(mockTopListData);

      const result = await viewer.getTodayTopList();

      expect(result[0]).toMatchObject({
        tsCode: '600519.SH',
        name: '贵州茅台',
        reason: '日涨跌幅达偏离值达7%',
        buyAmount: 50000,
        sellAmount: 30000,
        netAmount: 20000,
      });
    });

    test('应处理空数据情况', async () => {
      vi.mocked(TradingAwareScheduler.shouldRequest).mockReturnValue(true);
      mockGetTopList.mockResolvedValue([]);

      const result = await viewer.getTodayTopList();

      expect(result).toEqual([]);
    });
  });

  describe('getHistoricalTopList', () => {
    test('应获取最近 N 个交易日的龙虎榜数据', async () => {
      vi.mocked(TradingCalendar.isTradingDay)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      mockGetTopList
        .mockResolvedValueOnce([mockTopListData[0]])
        .mockResolvedValueOnce([mockTopListData[1]])
        .mockResolvedValueOnce([mockTopListData[2]]);

      const result = await viewer.getHistoricalTopList(3);

      expect(result).toHaveLength(3);
      expect(mockGetTopList).toHaveBeenCalledTimes(3);
    });

    test('应跳过非交易日', async () => {
      vi.mocked(TradingCalendar.isTradingDay)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      mockGetTopList.mockResolvedValue([mockTopListData[0]]);

      const result = await viewer.getHistoricalTopList(5);

      expect(result).toHaveLength(1);
    });

    test('days <= 0 应抛出错误', async () => {
      await expect(viewer.getHistoricalTopList(0)).rejects.toThrow('days must be greater than 0');
    });
  });

  describe('getStockTopListHistory', () => {
    test('应获取指定股票的龙虎榜历史', async () => {
      vi.mocked(TradingCalendar.isTradingDay).mockReturnValue(true);

      mockGetTopList
        .mockResolvedValueOnce([mockTopListData[0]])
        .mockResolvedValueOnce([mockTopListData[0]])
        .mockResolvedValueOnce([mockTopListData[0]]);

      const result = await viewer.getStockTopListHistory('600519.SH', 10);

      expect(result).toHaveLength(3);
      expect(mockGetTopList).toHaveBeenCalledTimes(3);
    });

    test('应跳过未上榜的交易日', async () => {
      vi.mocked(TradingCalendar.isTradingDay).mockReturnValue(true);

      mockGetTopList
        .mockResolvedValueOnce([mockTopListData[0]])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockTopListData[1]]);

      const result = await viewer.getStockTopListHistory('600519.SH', 5);

      expect(result).toHaveLength(2);
    });

    test('days <= 0 应抛出错误', async () => {
      await expect(viewer.getStockTopListHistory('600519.SH', 0)).rejects.toThrow(
        'days must be greater than 0'
      );
    });
  });
});
