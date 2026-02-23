/**
 * TopListViewer 单元测试
 *
 * 测试龙虎榜查看器功能
 * @module data-sources/astock/__tests__/top-list-viewer.test
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock 依赖模块（必须在导入之前）
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

// Mock TushareSource
class MockTushareSource {
  getTopList = vi.fn();
}

// Mock 数据
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

describe('TopListViewer', () => {
  let viewer: TopListViewer;
  let mockTushare: MockTushareSource;

  beforeEach(() => {
    vi.clearAllMocks();

    // 创建 mock TushareSource 实例
    mockTushare = new MockTushareSource();
    viewer = new TopListViewer(mockTushare as any);
  });

  describe('getTodayTopList', () => {
    test('应返回当日龙虎榜数据，按净买入降序排序', async () => {
      vi.mocked(TradingAwareScheduler.shouldRequest).mockReturnValue(true);
      mockTushare.getTopList.mockResolvedValue(mockTopListData);

      const result = await viewer.getTodayTopList();

      expect(result).toHaveLength(4);
      expect(mockTushare.getTopList).toHaveBeenCalledWith();

      // 验证排序：净买入降序
      expect(result[0].tsCode).toBe('600519.SH');
      expect(result[0].netAmount).toBe(20000);
      expect(result[0].rank).toBe(1);

      // 验证 tradeDate 字段存在
      expect(result[0].tradeDate).toBeDefined();
      expect(result[0].tradeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('非交易时段应返回空数组', async () => {
      vi.mocked(TradingAwareScheduler.shouldRequest).mockReturnValue(false);

      const result = await viewer.getTodayTopList();

      expect(result).toEqual([]);
      expect(mockTushare.getTopList).not.toHaveBeenCalled();
    });

    test('应正确转换数据格式', async () => {
      vi.mocked(TradingAwareScheduler.shouldRequest).mockReturnValue(true);
      mockTushare.getTopList.mockResolvedValue(mockTopListData);

      const result = await viewer.getTodayTopList();

      expect(result[0]).toMatchObject({
        tsCode: '600519.SH',
        name: '贵州茅台',
        reason: '日涨跌幅达偏离值达7%',
        buyAmount: 50000,
        sellAmount: 30000,
        netAmount: 20000,
        rank: 1,
      });
      expect(result[0]).toHaveProperty('tradeDate');
    });

    test('应处理空数据情况', async () => {
      vi.mocked(TradingAwareScheduler.shouldRequest).mockReturnValue(true);
      mockTushare.getTopList.mockResolvedValue([]);

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

      mockTushare.getTopList
        .mockResolvedValueOnce([mockTopListData[0]])
        .mockResolvedValueOnce([mockTopListData[1]])
        .mockResolvedValueOnce([mockTopListData[2]]);

      const result = await viewer.getHistoricalTopList(3);

      expect(result).toHaveLength(3);
      expect(mockTushare.getTopList).toHaveBeenCalledTimes(3);

      // 验证所有项目都有 tradeDate
      result.forEach(item => {
        expect(item.tradeDate).toBeDefined();
        expect(item.tradeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    test('应跳过非交易日', async () => {
      vi.mocked(TradingCalendar.isTradingDay)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      mockTushare.getTopList.mockResolvedValue([mockTopListData[0]]);

      const result = await viewer.getHistoricalTopList(5);

      expect(result).toHaveLength(1);
    });

    test('days <= 0 应抛出错误', async () => {
      await expect(viewer.getHistoricalTopList(0)).rejects.toThrow('days must be greater than 0');
    });

    test('API 错误时应记录警告并继续', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.mocked(TradingCalendar.isTradingDay).mockReturnValue(true);

      mockTushare.getTopList
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce([mockTopListData[0]])
        .mockResolvedValueOnce([mockTopListData[1]]);

      const result = await viewer.getHistoricalTopList(2);

      expect(result).toHaveLength(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch top list for'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('应有最大迭代保护', async () => {
      // 模拟所有日期都不是交易日
      vi.mocked(TradingCalendar.isTradingDay).mockReturnValue(false);

      const result = await viewer.getHistoricalTopList(5);

      // 应该在 MAX_ITERATIONS 后停止
      expect(result).toHaveLength(0);
      expect(vi.mocked(TradingCalendar.isTradingDay)).toHaveBeenCalledTimes(50); // 5 * 10
    });
  });

  describe('getStockTopListHistory', () => {
    test('应获取指定股票的龙虎榜历史', async () => {
      vi.mocked(TradingCalendar.isTradingDay)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false); // 第4次返回 false，让循环在迭代次数内停止

      mockTushare.getTopList
        .mockResolvedValueOnce([mockTopListData[0]])
        .mockResolvedValueOnce([mockTopListData[0]])
        .mockResolvedValueOnce([mockTopListData[0]]);

      const result = await viewer.getStockTopListHistory('600519.SH', 10);

      expect(result).toHaveLength(3);
      expect(mockTushare.getTopList).toHaveBeenCalledTimes(3);

      // 验证所有项目都有 tradeDate
      result.forEach(item => {
        expect(item.tradeDate).toBeDefined();
        expect(item.tradeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    test('应跳过未上榜的交易日', async () => {
      vi.mocked(TradingCalendar.isTradingDay).mockReturnValue(true);

      mockTushare.getTopList
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

    test('API 错误时应记录警告并继续', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.mocked(TradingCalendar.isTradingDay).mockReturnValue(true);

      mockTushare.getTopList
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce([mockTopListData[0]])
        .mockResolvedValueOnce([mockTopListData[1]]);

      const result = await viewer.getStockTopListHistory('600519.SH', 2);

      expect(result).toHaveLength(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch top list for'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('应有最大迭代保护', async () => {
      // 模拟所有日期都不是交易日
      vi.mocked(TradingCalendar.isTradingDay).mockReturnValue(false);

      const result = await viewer.getStockTopListHistory('600519.SH', 5);

      // 应该在 MAX_ITERATIONS 后停止
      expect(result).toHaveLength(0);
      expect(vi.mocked(TradingCalendar.isTradingDay)).toHaveBeenCalledTimes(50); // 5 * 10
    });
  });

  describe('数据格式转换', () => {
    test('应正确计算排名', async () => {
      vi.mocked(TradingAwareScheduler.shouldRequest).mockReturnValue(true);
      mockTushare.getTopList.mockResolvedValue(mockTopListData);

      const result = await viewer.getTodayTopList();

      // 验证排名计算
      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
      expect(result[2].rank).toBe(3);
      expect(result[3].rank).toBe(4);
    });

    test('应按净买入金额降序排序', async () => {
      vi.mocked(TradingAwareScheduler.shouldRequest).mockReturnValue(true);
      mockTushare.getTopList.mockResolvedValue(mockTopListData);

      const result = await viewer.getTodayTopList();

      // 验证排序
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].netAmount).toBeGreaterThanOrEqual(result[i + 1].netAmount);
      }
    });
  });
});
