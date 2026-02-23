/**
 * MoneyFlowMonitor 单元测试
 *
 * 测试资金流向监控器的各项功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MoneyFlowMonitor } from '../money-flow-monitor';
import { TushareSource, type MoneyFlowData as TushareMoneyFlowData } from '../../sources/tushare';
import { TradingCalendar } from '../trading-calendar';
import { TradingAwareScheduler } from '../trading-aware-scheduler';

// Mock TushareSource
vi.mock('../../sources/tushare', () => ({
  TushareSource: vi.fn(),
}));

// Mock TradingCalendar
vi.mock('../trading-calendar', () => ({
  TradingCalendar: {
    isTradingDay: vi.fn(),
    getTradingStatus: vi.fn(),
  },
}));

// Mock TradingAwareScheduler
vi.mock('../trading-aware-scheduler', () => ({
  TradingAwareScheduler: {
    shouldRequest: vi.fn(),
    smartDelay: vi.fn(),
    getRecommendedInterval: vi.fn(),
  },
}));

describe('MoneyFlowMonitor', () => {
  let monitor: MoneyFlowMonitor;
  let mockTushare: any;

  const mockMoneyFlowData: TushareMoneyFlowData = {
    ts_code: '600519.SH',
    trade_date: '20260220',
    net_mf_vol: 10000,
    net_mf_amount: 5000,
    net_buy_mf_vol: 8000,
    net_buy_mf_amount: 4000,
    net_buy_elg_vol: 2000,
    net_buy_elg_amount: 1000,
    net_buy_nr_vol: -500,
    net_buy_nr_amount: -200,
    net_buy_lg_vol: -10000,
    net_buy_lg_amount: -3000,
  };

  beforeEach(() => {
    // 创建 mock TushareSource 实例
    mockTushare = {
      getMoneyFlow: vi.fn(),
    };
    (TushareSource as any).mockImplementation(() => mockTushare);

    monitor = new MoneyFlowMonitor(mockTushare as unknown as TushareSource);

    // 默认 Mock 返回值
    vi.mocked(TradingCalendar.isTradingDay).mockReturnValue(true);
    vi.mocked(TradingAwareScheduler.shouldRequest).mockReturnValue(true);
    vi.mocked(TradingAwareScheduler.smartDelay).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getStockMoneyFlow', () => {
    it('应成功获取资金流向数据', async () => {
      mockTushare.getMoneyFlow.mockResolvedValue([mockMoneyFlowData]);

      const result = await monitor.getStockMoneyFlow('600519.SH');

      expect(result).toBeDefined();
      expect(result.tsCode).toBe('600519.SH');
      expect(result.tradeDate).toBe('2026-02-20');
      expect(result.netMainInflow).toBe(5000); // 超大单 + 大单
      expect(result.largeNet).toBeCloseTo(0.2, 1); // 2000手 / 10000
      expect(result.retailInflow).toBe(3000); // 取反
    });

    it('应使用默认日期（最新交易日）', async () => {
      mockTushare.getMoneyFlow.mockResolvedValue([mockMoneyFlowData]);

      await monitor.getStockMoneyFlow('600519.SH');

      expect(mockTushare.getMoneyFlow).toHaveBeenCalledWith({
        tsCode: '600519.SH',
        startDate: expect.any(String),
        endDate: expect.any(String),
      });
    });

    it('应使用指定日期查询', async () => {
      mockTushare.getMoneyFlow.mockResolvedValue([mockMoneyFlowData]);

      await monitor.getStockMoneyFlow('600519.SH', '2026-02-18');

      expect(mockTushare.getMoneyFlow).toHaveBeenCalledWith({
        tsCode: '600519.SH',
        startDate: '20260218',
        endDate: '20260218',
      });
    });

    it('非交易时段应抛出错误', async () => {
      vi.mocked(TradingAwareScheduler.shouldRequest).mockReturnValue(false);

      await expect(
        monitor.getStockMoneyFlow('600519.SH')
      ).rejects.toThrow('Market is closed');
    });

    it('非交易日应抛出错误', async () => {
      vi.mocked(TradingCalendar.isTradingDay).mockReturnValue(false);

      await expect(
        monitor.getStockMoneyFlow('600519.SH', '2026-02-18')
      ).rejects.toThrow('is not a trading day');
    });

    it('无数据时应抛出错误', async () => {
      mockTushare.getMoneyFlow.mockResolvedValue([]);

      await expect(
        monitor.getStockMoneyFlow('600519.SH')
      ).rejects.toThrow('No money flow data available');
    });

    it('应正确计算主力净流入占比', async () => {
      mockTushare.getMoneyFlow.mockResolvedValue([mockMoneyFlowData]);

      const result = await monitor.getStockMoneyFlow('600519.SH');

      // 主力净流入 5000 万元，假设总成交额 10000 万元
      expect(result.mainInflowRate).toBeCloseTo(50, 0); // 50%
    });

    it('应正确处理零值数据', async () => {
      const zeroData: TushareMoneyFlowData = {
        ts_code: '600519.SH',
        trade_date: '20260220',
        net_mf_amount: 0,
        net_buy_elg_vol: 0,
        net_buy_lg_amount: 0,
      };

      mockTushare.getMoneyFlow.mockResolvedValue([zeroData]);

      const result = await monitor.getStockMoneyFlow('600519.SH');

      expect(result.netMainInflow).toBe(0);
      expect(result.largeNet).toBe(0);
      expect(result.retailInflow).toBe(0); // 确保不返回 -0
      expect(Object.is(result.retailInflow, 0)).toBe(true); // 检查不是 -0
    });
  });

  describe('getMoneyFlowTrend', () => {
    it('应成功获取资金流向趋势', async () => {
      const mockData = [
        { ...mockMoneyFlowData, trade_date: '20260220', net_mf_amount: 5000 },
        { ...mockMoneyFlowData, trade_date: '20260219', net_mf_amount: 3000 },
        { ...mockMoneyFlowData, trade_date: '20260218', net_mf_amount: 2000 },
      ];

      mockTushare.getMoneyFlow.mockImplementation(async ({ startDate }) => {
        const item = mockData.find(d => d.trade_date === startDate);
        return item ? [item] : [];
      });

      const result = await monitor.getMoneyFlowTrend('600519.SH', 3);

      expect(result.data).toHaveLength(3);
      // 主力净流入 = (5000+1000) + (3000+1000) + (2000+1000) = 15000
      // 因为每条数据都有 net_buy_elg_amount: 1000
      expect(result.totalMainInflow).toBeCloseTo(15000, 0);
      expect(result.avgMainInflow).toBeCloseTo(5000, 0);
      expect(result.consecutiveInflowDays).toBeGreaterThanOrEqual(3);
    });

    it('应识别看涨趋势', async () => {
      const mockData = [
        { ...mockMoneyFlowData, trade_date: '20260220', net_mf_amount: 5000 },
        { ...mockMoneyFlowData, trade_date: '20260219', net_mf_amount: 3000 },
        { ...mockMoneyFlowData, trade_date: '20260218', net_mf_amount: 2000 },
      ];

      mockTushare.getMoneyFlow.mockImplementation(async ({ startDate }) => {
        const item = mockData.find(d => d.trade_date === startDate);
        return item ? [item] : [];
      });

      const result = await monitor.getMoneyFlowTrend('600519.SH', 3);

      expect(result.trend).toBe('bullish');
    });

    it('应识别看跌趋势', async () => {
      const mockData = [
        {
          ...mockMoneyFlowData,
          trade_date: '20260220',
          net_mf_amount: -5000,
          net_buy_mf_amount: -5000,
          net_buy_elg_amount: -1000,
        },
        {
          ...mockMoneyFlowData,
          trade_date: '20260219',
          net_mf_amount: -3000,
          net_buy_mf_amount: -3000,
          net_buy_elg_amount: -1000,
        },
        {
          ...mockMoneyFlowData,
          trade_date: '20260218',
          net_mf_amount: -2000,
          net_buy_mf_amount: -2000,
          net_buy_elg_amount: -1000,
        },
      ];

      mockTushare.getMoneyFlow.mockImplementation(async ({ startDate }) => {
        const item = mockData.find((d) => d.trade_date === startDate);
        return item ? [item] : [];
      });

      const result = await monitor.getMoneyFlowTrend('600519.SH', 3);

      expect(result.trend).toBe('bearish');
    });

    it('应识别中性趋势', async () => {
      const mockData = [
        { ...mockMoneyFlowData, trade_date: '20260220', net_mf_amount: 1000 },
        { ...mockMoneyFlowData, trade_date: '20260219', net_mf_amount: -1000 },
      ];

      mockTushare.getMoneyFlow.mockImplementation(async ({ startDate }) => {
        const item = mockData.find(d => d.trade_date === startDate);
        return item ? [item] : [];
      });

      const result = await monitor.getMoneyFlowTrend('600519.SH', 2);

      expect(result.trend).toBe('neutral');
    });

    it('应跳过非交易日', async () => {
      let callCount = 0;
      mockTushare.getMoneyFlow.mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          return []; // 模拟非交易日无数据
        }
        return [mockMoneyFlowData];
      });

      vi.mocked(TradingCalendar.isTradingDay)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const result = await monitor.getMoneyFlowTrend('600519.SH', 1);

      expect(result.data).toHaveLength(1);
    });

    it('应使用 TradingAwareScheduler 智能延迟', async () => {
      mockTushare.getMoneyFlow.mockResolvedValue([mockMoneyFlowData]);

      await monitor.getMoneyFlowTrend('600519.SH', 3);

      expect(TradingAwareScheduler.smartDelay).toHaveBeenCalled();
    });

    it('天数小于等于0时应抛出错误', async () => {
      await expect(
        monitor.getMoneyFlowTrend('600519.SH', 0)
      ).rejects.toThrow('days must be greater than 0');

      await expect(
        monitor.getMoneyFlowTrend('600519.SH', -1)
      ).rejects.toThrow('days must be greater than 0');
    });

    it('应正确计算连续净流入天数', async () => {
      const mockData = [
        {
          ...mockMoneyFlowData,
          trade_date: '20260220',
          net_mf_amount: 5000,
          net_buy_mf_amount: 5000,
          net_buy_elg_amount: 1000,
        },
        {
          ...mockMoneyFlowData,
          trade_date: '20260219',
          net_mf_amount: 3000,
          net_buy_mf_amount: 3000,
          net_buy_elg_amount: 1000,
        },
        {
          ...mockMoneyFlowData,
          trade_date: '20260218',
          net_mf_amount: 2000,
          net_buy_mf_amount: 2000,
          net_buy_elg_amount: 1000,
        },
        {
          ...mockMoneyFlowData,
          trade_date: '20260217',
          net_mf_amount: -1000,
          net_buy_mf_amount: -2000,
          net_buy_elg_amount: 1000,
        },
      ];

      mockTushare.getMoneyFlow.mockImplementation(async ({ startDate }) => {
        const item = mockData.find((d) => d.trade_date === startDate);
        return item ? [item] : [];
      });

      const result = await monitor.getMoneyFlowTrend('600519.SH', 4);

      // 从最新数据开始，遇到负值时停止计数
      expect(result.consecutiveInflowDays).toBe(3);
      expect(result.consecutiveOutflowDays).toBe(0);
    });

    it('应正确计算连续净流出天数', async () => {
      const mockData = [
        {
          ...mockMoneyFlowData,
          trade_date: '20260220',
          net_mf_amount: -6000,
          net_buy_mf_amount: -6000,
          net_buy_elg_amount: -1000,
        },
        {
          ...mockMoneyFlowData,
          trade_date: '20260219',
          net_mf_amount: -4000,
          net_buy_mf_amount: -4000,
          net_buy_elg_amount: -1000,
        },
        {
          ...mockMoneyFlowData,
          trade_date: '20260218',
          net_mf_amount: -3000,
          net_buy_mf_amount: -3000,
          net_buy_elg_amount: -1000,
        },
      ];

      mockTushare.getMoneyFlow.mockImplementation(async ({ startDate }) => {
        const item = mockData.find((d) => d.trade_date === startDate);
        return item ? [item] : [];
      });

      const result = await monitor.getMoneyFlowTrend('600519.SH', 3);

      expect(result.consecutiveOutflowDays).toBe(3);
      expect(result.consecutiveInflowDays).toBe(0);
    });

    it('应处理空数据情况', async () => {
      mockTushare.getMoneyFlow.mockResolvedValue([]);

      const result = await monitor.getMoneyFlowTrend('600519.SH', 3);

      expect(result.data).toHaveLength(0);
      expect(result.avgMainInflow).toBe(0);
      expect(result.totalMainInflow).toBe(0);
      expect(result.trend).toBe('neutral');
    });
  });

  describe('monitorLargeOrders', () => {
    it('应成功生成大单监控数据', async () => {
      mockTushare.getMoneyFlow.mockResolvedValue([mockMoneyFlowData]);

      const result = await monitor.monitorLargeOrders('600519.SH');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].tsCode).toBe('600519.SH');
      expect(['buy', 'sell']).toContain(result[0].direction);
    });

    it('非交易时段应返回空数组', async () => {
      vi.mocked(TradingAwareScheduler.shouldRequest).mockReturnValue(false);

      const result = await monitor.monitorLargeOrders('600519.SH');

      expect(result).toHaveLength(0);
    });

    it('大单净流入为正时应生成买单', async () => {
      mockTushare.getMoneyFlow.mockResolvedValue([mockMoneyFlowData]);

      const result = await monitor.monitorLargeOrders('600519.SH');

      // 由于 largeNet 为正，应生成买单
      expect(result[0].direction).toBe('buy');
    });

    it('大单净流入为负时应生成卖单', async () => {
      const negativeFlowData = {
        ...mockMoneyFlowData,
        net_buy_elg_vol: -2000,
        net_buy_elg_amount: -1000,
      };

      mockTushare.getMoneyFlow.mockResolvedValue([negativeFlowData]);

      const result = await monitor.monitorLargeOrders('600519.SH');

      expect(result[0].direction).toBe('sell');
    });

    it('应按时间排序大单记录', async () => {
      mockTushare.getMoneyFlow.mockResolvedValue([mockMoneyFlowData]);

      const result = await monitor.monitorLargeOrders('600519.SH');

      // 检查是否按时间升序排列
      for (let i = 1; i < result.length; i++) {
        expect(result[i].time >= result[i - 1].time).toBe(true);
      }
    });

    it('应限制最大订单数量', async () => {
      // 创建一个非常大的净流入量
      const largeFlowData = {
        ...mockMoneyFlowData,
        net_buy_elg_vol: 100000000, // 巨量
      };

      mockTushare.getMoneyFlow.mockResolvedValue([largeFlowData]);

      const result = await monitor.monitorLargeOrders('600519.SH');

      // 最多生成 50 笔记录
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('零成交量时应返回空数组', async () => {
      const zeroFlowData = {
        ...mockMoneyFlowData,
        net_buy_elg_vol: 0,
      };

      mockTushare.getMoneyFlow.mockResolvedValue([zeroFlowData]);

      const result = await monitor.monitorLargeOrders('600519.SH');

      expect(result).toHaveLength(0);
    });

    it('应生成正确的时间格式', async () => {
      mockTushare.getMoneyFlow.mockResolvedValue([mockMoneyFlowData]);

      const result = await monitor.monitorLargeOrders('600519.SH');

      // 检查时间格式 HH:MM:SS
      expect(result[0].time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it('应生成合理的成交量波动', async () => {
      mockTushare.getMoneyFlow.mockResolvedValue([mockMoneyFlowData]);

      const result = await monitor.monitorLargeOrders('600519.SH');

      // 检查成交量在合理范围内（100 ± 100）
      result.forEach(order => {
        expect(order.volume).toBeGreaterThanOrEqual(0);
        expect(order.volume).toBeLessThanOrEqual(300);
      });
    });
  });

  describe('日期格式化', () => {
    it('应正确格式化 Tushare 日期', async () => {
      mockTushare.getMoneyFlow.mockResolvedValue([mockMoneyFlowData]);

      await monitor.getStockMoneyFlow('600519.SH', '2026-02-20');

      expect(mockTushare.getMoneyFlow).toHaveBeenCalledWith({
        tsCode: '600519.SH',
        startDate: '20260220',
        endDate: '20260220',
      });
    });

    it('应正确格式化显示日期', async () => {
      mockTushare.getMoneyFlow.mockResolvedValue([mockMoneyFlowData]);

      const result = await monitor.getStockMoneyFlow('600519.SH', '2026-02-20');

      expect(result.tradeDate).toBe('2026-02-20');
    });
  });

  describe('错误处理', () => {
    it('应处理 API 错误', async () => {
      mockTushare.getMoneyFlow.mockRejectedValue(
        new Error('API request failed')
      );

      await expect(
        monitor.getStockMoneyFlow('600519.SH')
      ).rejects.toThrow('API request failed');
    });

    it('应在趋势查询中继续处理错误日期', async () => {
      let callCount = 0;
      mockTushare.getMoneyFlow.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary error');
        }
        return [mockMoneyFlowData];
      });

      // 应该继续处理而不抛出错误
      const result = await monitor.getMoneyFlowTrend('600519.SH', 2);

      expect(result.data.length).toBeGreaterThan(0);
    });
  });
});
