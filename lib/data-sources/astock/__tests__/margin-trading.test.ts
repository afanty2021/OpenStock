/**
 * MarginTrading 单元测试
 *
 * 测试融资融券数据类的各项功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarginTrading } from '../margin-trading';
import { TushareSource, type MarginDetailData } from '../../sources/tushare';
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

describe('MarginTrading', () => {
  let marginTrading: MarginTrading;
  let mockTushare: any;

  // 测试用的模拟数据
  const mockMarginData: MarginDetailData = {
    ts_code: '600519.SH',
    trade_date: '20260220',
    rz_ratio: 100000,      // 融资余额(万元)
    rz_che: 5000,          // 融资买入额(万元)
    rz_ch: 3000,           // 融资偿还额(万元)
    rq_ratio: 5000,        // 融券余额(万元)
    rq_che: 200,           // 融券卖出量(手)
    rq_ch: 150,            // 融券偿还量(手)
    rz_rq_ratio: 20,       // 融资融券余额比
  };

  const mockMarginData2: MarginDetailData = {
    ts_code: '600519.SH',
    trade_date: '20260219',
    rz_ratio: 95000,       // 融资余额减少
    rz_che: 4000,
    rz_ch: 3500,
    rq_ratio: 5500,        // 融券余额增加
    rq_che: 250,
    rq_ch: 100,
    rz_rq_ratio: 17.27,    // 融资融券比下降
  };

  const mockMarginData3: MarginDetailData = {
    ts_code: '600519.SH',
    trade_date: '20260218',
    rz_ratio: 90000,
    rz_che: 4500,
    rz_ch: 3200,
    rq_ratio: 4800,
    rq_che: 180,
    rq_ch: 120,
    rz_rq_ratio: 18.75,
  };

  const mockMarginDataBullish: MarginDetailData = {
    ts_code: '600519.SH',
    trade_date: '20260220',
    rz_ratio: 110000,      // 融资余额增加
    rz_che: 6000,          // 融资买入增加
    rz_ch: 2000,           // 融资偿还减少
    rq_ratio: 4000,        // 融券余额减少
    rq_che: 100,           // 融券卖出减少
    rq_ch: 200,            // 融券偿还增加
    rz_rq_ratio: 27.5,     // 融资融券比上升
  };

  const mockMarginDataBearish: MarginDetailData = {
    ts_code: '600519.SH',
    trade_date: '20260220',
    rz_ratio: 90000,       // 融资余额减少
    rz_che: 3000,          // 融资买入减少
    rz_ch: 5000,           // 融资偿还增加
    rq_ratio: 8000,        // 融券余额增加
    rq_che: 400,           // 融券卖出增加
    rq_ch: 50,             // 融券偿还减少
    rz_rq_ratio: 11.25,    // 融资融券比下降
  };

  beforeEach(() => {
    // 创建 mock TushareSource 实例
    mockTushare = {
      getMarginDetail: vi.fn(),
    };
    (TushareSource as any).mockImplementation(() => mockTushare);

    marginTrading = new MarginTrading(mockTushare as unknown as TushareSource);

    // 默认 Mock 返回值
    vi.mocked(TradingCalendar.isTradingDay).mockReturnValue(true);
    vi.mocked(TradingAwareScheduler.shouldRequest).mockReturnValue(true);
    vi.mocked(TradingAwareScheduler.smartDelay).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getMarginData', () => {
    it('应成功获取融资融券数据', async () => {
      mockTushare.getMarginDetail.mockResolvedValue([mockMarginData]);

      const result = await marginTrading.getMarginData('600519.SH');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.tsCode).toBe('600519.SH');
      expect(result.data?.tradeDate).toBe('2026-02-20');
      expect(result.data?.marginBalance).toBe(100000);
      expect(result.data?.marginBuy).toBe(5000);
      expect(result.data?.marginRepay).toBe(3000);
      expect(result.data?.shortBalance).toBe(5000);
      expect(result.data?.shortSell).toBe(200);
      expect(result.data?.shortCover).toBe(150);
      expect(result.data?.marginRatio).toBe(20);
    });

    it('应使用默认日期（最新交易日）', async () => {
      mockTushare.getMarginDetail.mockResolvedValue([mockMarginData]);

      await marginTrading.getMarginData('600519.SH');

      expect(mockTushare.getMarginDetail).toHaveBeenCalledWith({
        tsCode: '600519.SH',
        startDate: expect.any(String),
        endDate: expect.any(String),
      });
    });

    it('应使用指定日期查询', async () => {
      mockTushare.getMarginDetail.mockResolvedValue([mockMarginData]);

      await marginTrading.getMarginData('600519.SH', '2026-02-20');

      expect(mockTushare.getMarginDetail).toHaveBeenCalledWith({
        tsCode: '600519.SH',
        startDate: '20260220',
        endDate: '20260220',
      });
    });

    it('应在非交易时段返回错误', async () => {
      vi.mocked(TradingAwareScheduler.shouldRequest).mockReturnValue(false);

      const result = await marginTrading.getMarginData('600519.SH');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Market is closed');
    });

    it('应在非交易日返回错误', async () => {
      vi.mocked(TradingCalendar.isTradingDay).mockReturnValue(false);

      const result = await marginTrading.getMarginData('600519.SH', '2026-02-20');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a trading day');
    });

    it('应在无数据时返回错误', async () => {
      mockTushare.getMarginDetail.mockResolvedValue([]);

      const result = await marginTrading.getMarginData('600519.SH');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No margin data available');
    });

    it('应正确处理数据源错误', async () => {
      mockTushare.getMarginDetail.mockRejectedValue(new Error('API Error'));

      const result = await marginTrading.getMarginData('600519.SH');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('应正确转换零值', async () => {
      const zeroData: MarginDetailData = {
        ts_code: '600519.SH',
        trade_date: '20260220',
        rz_ratio: 0,
        rz_che: 0,
        rz_ch: 0,
        rq_ratio: 0,
        rq_che: 0,
        rq_ch: 0,
        rz_rq_ratio: 0,
      };

      mockTushare.getMarginDetail.mockResolvedValue([zeroData]);

      const result = await marginTrading.getMarginData('600519.SH');

      expect(result.success).toBe(true);
      expect(result.data?.marginBalance).toBe(0);
      expect(result.data?.shortBalance).toBe(0);
      expect(result.data?.marginRatio).toBe(0);
    });
  });

  describe('getMarginTrend', () => {
    it('应成功获取融资融券趋势（多日）', async () => {
      mockTushare.getMarginDetail
        .mockResolvedValueOnce([mockMarginData])    // 20260220
        .mockResolvedValueOnce([mockMarginData2])   // 20260219
        .mockResolvedValueOnce([mockMarginData3]);  // 20260218

      const result = await marginTrading.getMarginTrend('600519.SH', 3);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBe(3);
      expect(result.trend).toBeDefined();
    });

    it('应正确计算融资余额变化', async () => {
      mockTushare.getMarginDetail
        .mockResolvedValueOnce([mockMarginData])    // 最新: 100000
        .mockResolvedValueOnce([mockMarginData3]);  // 最早: 90000

      const result = await marginTrading.getMarginTrend('600519.SH', 2);

      expect(result.trend?.marginBalanceChange).toBe(10000);
      expect(result.trend?.marginBalanceChangeRate).toBeCloseTo(11.11, 1);
    });

    it('应正确计算融券余额变化', async () => {
      mockTushare.getMarginDetail
        .mockResolvedValueOnce([mockMarginData])    // 最新: 5000
        .mockResolvedValueOnce([mockMarginData3]);  // 最早: 4800

      const result = await marginTrading.getMarginTrend('600519.SH', 2);

      expect(result.trend?.shortBalanceChange).toBe(200);
      expect(result.trend?.shortBalanceChangeRate).toBeCloseTo(4.17, 1);
    });

    it('应正确计算融资融券比变化', async () => {
      mockTushare.getMarginDetail
        .mockResolvedValueOnce([mockMarginData])    // 最新: 20
        .mockResolvedValueOnce([mockMarginData3]);  // 最早: 18.75

      const result = await marginTrading.getMarginTrend('600519.SH', 2);

      expect(result.trend?.marginRatioChange).toBeCloseTo(1.25, 2);
    });

    it('应判断看涨情绪', async () => {
      // 融资余额增加 + 融券余额减少 + 融资融券比上升
      mockTushare.getMarginDetail
        .mockResolvedValueOnce([mockMarginDataBullish])  // 最新
        .mockResolvedValueOnce([mockMarginData2]);       // 最早

      const result = await marginTrading.getMarginTrend('600519.SH', 2);

      expect(result.trend?.sentiment).toBe('bullish');
    });

    it('应判断看跌情绪', async () => {
      // 融资余额减少 + 融券余额增加 + 融资融券比下降
      mockTushare.getMarginDetail
        .mockResolvedValueOnce([mockMarginDataBearish])  // 最新
        .mockResolvedValueOnce([mockMarginData2]);        // 最早

      const result = await marginTrading.getMarginTrend('600519.SH', 2);

      expect(result.trend?.sentiment).toBe('bearish');
    });

    it('应判断中性情绪', async () => {
      // 变化较小 - 创建变化小于 3% 的数据
      const neutralData1: MarginDetailData = {
        ...mockMarginData,
        rz_ratio: 100000,
        rq_ratio: 5000,
        rz_rq_ratio: 20,
      };
      const neutralData2: MarginDetailData = {
        ...mockMarginData2,
        rz_ratio: 98000,  // 变化约 2.04%，小于 3%
        rq_ratio: 5050,   // 变化约 1%，小于 3%
        rz_rq_ratio: 19.4,
      };

      mockTushare.getMarginDetail
        .mockResolvedValueOnce([neutralData1])
        .mockResolvedValueOnce([neutralData2]);

      const result = await marginTrading.getMarginTrend('600519.SH', 2);

      // 变化率 < 3%，判断为中性
      expect(result.trend?.sentiment).toBe('neutral');
    });

    it('应使用智能延迟', async () => {
      mockTushare.getMarginDetail
        .mockResolvedValue([mockMarginData]);

      await marginTrading.getMarginTrend('600519.SH', 3);

      // 第一次调用不延迟，后续调用会延迟
      expect(TradingAwareScheduler.smartDelay).toHaveBeenCalled();
    });

    it('应在天数 <= 0 时返回错误', async () => {
      const result = await marginTrading.getMarginTrend('600519.SH', 0);

      expect(result.success).toBe(false);
      expect(result.error).toContain('days must be greater than 0');
    });

    it('应在无数据时返回错误', async () => {
      mockTushare.getMarginDetail.mockResolvedValue([]);

      const result = await marginTrading.getMarginTrend('600519.SH', 3);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No margin data available');
    });

    it('应在单日数据时返回零变化', async () => {
      mockTushare.getMarginDetail.mockResolvedValue([mockMarginData]);

      const result = await marginTrading.getMarginTrend('600519.SH', 1);

      expect(result.trend?.marginBalanceChange).toBe(0);
      expect(result.trend?.marginBalanceChangeRate).toBe(0);
      expect(result.trend?.sentiment).toBe('neutral');
    });

    it('应跳过非交易日', async () => {
      // 模拟非交易日
      vi.mocked(TradingCalendar.isTradingDay)
        .mockReturnValueOnce(true)   // 第一天
        .mockReturnValueOnce(false)  // 第二天（非交易日）
        .mockReturnValueOnce(true);  // 第三天

      mockTushare.getMarginDetail.mockResolvedValue([mockMarginData]);

      const result = await marginTrading.getMarginTrend('600519.SH', 3);

      // 应该跳过非交易日，继续查找
      expect(mockTushare.getMarginDetail).toHaveBeenCalled();
    });

    it('应在数据源错误时继续处理其他日期', async () => {
      mockTushare.getMarginDetail
        .mockResolvedValueOnce([mockMarginData])    // 成功
        .mockRejectedValueOnce(new Error('API Error'))  // 失败
        .mockResolvedValueOnce([mockMarginData2]);  // 成功

      const result = await marginTrading.getMarginTrend('600519.SH', 3);

      // 即使有错误，也应该返回部分数据
      expect(result.success).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeSentiment', () => {
    it('应成功分析看涨情绪', async () => {
      mockTushare.getMarginDetail
        .mockResolvedValueOnce([mockMarginDataBullish])
        .mockResolvedValueOnce([mockMarginData2]);

      const result = await marginTrading.analyzeSentiment('600519.SH', 2);

      expect(result.success).toBe(true);
      expect(result.data?.sentiment).toBe('bullish');
      expect(result.data?.confidence).toBeGreaterThan(50);
      expect(result.data?.reasons.length).toBeGreaterThan(0);
    });

    it('应成功分析看跌情绪', async () => {
      mockTushare.getMarginDetail
        .mockResolvedValueOnce([mockMarginDataBearish])
        .mockResolvedValueOnce([mockMarginData2]);

      const result = await marginTrading.analyzeSentiment('600519.SH', 2);

      expect(result.success).toBe(true);
      expect(result.data?.sentiment).toBe('bearish');
      expect(result.data?.confidence).toBeGreaterThan(50);
      expect(result.data?.reasons.length).toBeGreaterThan(0);
    });

    it('应提供看涨原因', async () => {
      mockTushare.getMarginDetail
        .mockResolvedValueOnce([mockMarginDataBullish])
        .mockResolvedValueOnce([mockMarginData2]);

      const result = await marginTrading.analyzeSentiment('600519.SH', 2);

      expect(result.data?.reasons).toContain('融资余额增加 15.79%');
      expect(result.data?.reasons).toContain('融券余额减少 27.27%');
      expect(result.data?.reasons).toContain('融资融券比上升 10.23');
    });

    it('应提供看跌原因', async () => {
      mockTushare.getMarginDetail
        .mockResolvedValueOnce([mockMarginDataBearish])
        .mockResolvedValueOnce([mockMarginData2]);

      const result = await marginTrading.analyzeSentiment('600519.SH', 2);

      const reasons = result.data?.reasons || [];
      expect(reasons.some(r => r.includes('融资余额减少'))).toBe(true);
      expect(reasons.some(r => r.includes('融券余额增加'))).toBe(true);
    });

    it('应在变化平稳时返回中性', async () => {
      // 使用变化较小的数据（变化率 < 3%）
      const neutralData1: MarginDetailData = {
        ...mockMarginData,
        rz_ratio: 100000,
        rq_ratio: 5000,
        rz_rq_ratio: 20,
      };
      const neutralData2: MarginDetailData = {
        ...mockMarginData2,
        rz_ratio: 98000,  // 变化约 2.04%，小于 3%
        rq_ratio: 5050,   // 变化约 1%，小于 3%
        rz_rq_ratio: 19.4,
      };

      mockTushare.getMarginDetail
        .mockResolvedValueOnce([neutralData1])
        .mockResolvedValueOnce([neutralData2]);

      const result = await marginTrading.analyzeSentiment('600519.SH', 2);

      expect(result.data?.sentiment).toBe('neutral');
    });

    it('应在无数据时返回错误', async () => {
      mockTushare.getMarginDetail.mockResolvedValue([]);

      const result = await marginTrading.analyzeSentiment('600519.SH', 2);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应在趋势分析失败时返回错误', async () => {
      // getMarginTrend 返回成功但无数据的情况
      mockTushare.getMarginDetail.mockResolvedValue([]);

      const result = await marginTrading.analyzeSentiment('600519.SH', 2);

      expect(result.success).toBe(false);
    });

    it('应正确计算信心度', async () => {
      mockTushare.getMarginDetail
        .mockResolvedValueOnce([mockMarginDataBullish])
        .mockResolvedValueOnce([mockMarginData2]);

      const result = await marginTrading.analyzeSentiment('600519.SH', 2);

      expect(result.data?.confidence).toBeGreaterThanOrEqual(30);
      expect(result.data?.confidence).toBeLessThanOrEqual(100);
    });

    it('应在强趋势时提高信心度', async () => {
      // 创建强看涨数据
      const strongBullish: MarginDetailData = {
        ...mockMarginDataBullish,
        rz_ratio: 120000,  // 更强的增长
      };

      mockTushare.getMarginDetail
        .mockResolvedValueOnce([strongBullish])
        .mockResolvedValueOnce([mockMarginData]);

      const result = await marginTrading.analyzeSentiment('600519.SH', 2);

      expect(result.data?.confidence).toBeGreaterThan(70);
    });

    it('应使用默认天数', async () => {
      mockTushare.getMarginDetail
        .mockResolvedValue([mockMarginData]);

      await marginTrading.analyzeSentiment('600519.SH');

      // 默认应该查询 5 天
      expect(mockTushare.getMarginDetail).toHaveBeenCalledTimes(5);
    });
  });

  describe('日期格式化', () => {
    it('应正确格式化显示日期', async () => {
      mockTushare.getMarginDetail.mockResolvedValue([mockMarginData]);

      const result = await marginTrading.getMarginData('600519.SH', '2026-02-20');

      expect(result.data?.tradeDate).toBe('2026-02-20');
    });

    it('应正确解析 Tushare 日期', async () => {
      const dataWithDate: MarginDetailData = {
        ...mockMarginData,
        trade_date: '20260220',
      };

      mockTushare.getMarginDetail.mockResolvedValue([dataWithDate]);

      const result = await marginTrading.getMarginData('600519.SH');

      expect(result.data?.tradeDate).toBe('2026-02-20');
    });

    it('应在日期格式错误时抛出异常', async () => {
      await expect(marginTrading.getMarginData('600519.SH', 'invalid-date'))
        .rejects.toThrow('Invalid date format');
    });
  });

  describe('边界情况', () => {
    it('应处理空融资融券数据', async () => {
      const emptyData: MarginDetailData = {
        ts_code: '600519.SH',
        trade_date: '20260220',
        rz_ratio: 0,
        rz_che: 0,
        rz_ch: 0,
        rq_ratio: 0,
        rq_che: 0,
        rq_ch: 0,
        rz_rq_ratio: 0,
      };

      mockTushare.getMarginDetail.mockResolvedValue([emptyData]);

      const result = await marginTrading.getMarginData('600519.SH');

      expect(result.success).toBe(true);
      expect(result.data?.marginBalance).toBe(0);
      expect(result.data?.marginRatio).toBe(0);
    });

    it('应处理极大的融资融券数据', async () => {
      const largeData: MarginDetailData = {
        ...mockMarginData,
        rz_ratio: 999999999,  // 极大值
        rq_ratio: 999999999,
      };

      mockTushare.getMarginDetail.mockResolvedValue([largeData]);

      const result = await marginTrading.getMarginData('600519.SH');

      expect(result.success).toBe(true);
      expect(result.data?.marginBalance).toBe(999999999);
    });

    it('应处理负数融资融券数据（异常情况）', async () => {
      const negativeData: MarginDetailData = {
        ...mockMarginData,
        rz_ratio: -1000,  // 异常负值
        rq_ratio: -500,
      };

      mockTushare.getMarginDetail.mockResolvedValue([negativeData]);

      const result = await marginTrading.getMarginData('600519.SH');

      expect(result.success).toBe(true);
      expect(result.data?.marginBalance).toBe(-1000);
    });
  });

  describe('集成测试', () => {
    it('应完整处理多日趋势分析流程', async () => {
      // 模拟 5 日数据
      const dailyData: MarginDetailData[] = [
        mockMarginData,
        mockMarginData2,
        mockMarginData3,
        mockMarginData3,
        mockMarginData3,
      ];

      mockTushare.getMarginDetail.mockResolvedValue(dailyData);

      const result = await marginTrading.getMarginTrend('600519.SH', 5);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(5);
      expect(result.trend).toBeDefined();
      expect(result.trend?.sentiment).toBeDefined();
    });

    it('应完整处理情绪分析流程', async () => {
      mockTushare.getMarginDetail
        .mockResolvedValueOnce([mockMarginDataBullish])
        .mockResolvedValueOnce([mockMarginData2])
        .mockResolvedValueOnce([mockMarginData3])
        .mockResolvedValueOnce([mockMarginData3])
        .mockResolvedValueOnce([mockMarginData3]);

      const result = await marginTrading.analyzeSentiment('600519.SH', 5);

      expect(result.success).toBe(true);
      expect(result.data?.sentiment).toBeDefined();
      expect(result.data?.confidence).toBeDefined();
      expect(result.data?.reasons).toBeDefined();
      expect(result.data?.reasons.length).toBeGreaterThan(0);
    });
  });
});
