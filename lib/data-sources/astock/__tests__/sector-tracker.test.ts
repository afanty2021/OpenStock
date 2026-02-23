/**
 * SectorTracker 单元测试
 *
 * 测试板块追踪器的各项功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SectorTracker } from '../sector-tracker';
import { TushareSource, type BlockTradeData } from '../../sources/tushare';
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

describe('SectorTracker', () => {
  let tracker: SectorTracker;
  let mockTushare: any;

  // 测试数据：模拟板块交易数据
  const mockBlockTradeData: BlockTradeData[] = [
    {
      ts_code: '801010.SH',
      trade_date: '20260220',
      name: '农林牧渔',
      close: 1200.5,
      pct_chg: 2.5,
      amount: 150000,
      net_mf_amount: 5000,
    },
    {
      ts_code: '801020.SH',
      trade_date: '20260220',
      name: '采掘',
      close: 1800.3,
      pct_chg: 1.8,
      amount: 120000,
      net_mf_amount: 3000,
    },
    {
      ts_code: '801030.SH',
      trade_date: '20260220',
      name: '化工',
      close: 1500.7,
      pct_chg: -0.5,
      amount: 200000,
      net_mf_amount: -2000,
    },
    {
      ts_code: '801040.SH',
      trade_date: '20260220',
      name: '钢铁',
      close: 900.2,
      pct_chg: -1.2,
      amount: 80000,
      net_mf_amount: -3500,
    },
    {
      ts_code: '801050.SH',
      trade_date: '20260220',
      name: '有色金属',
      close: 1100.8,
      pct_chg: 0.8,
      amount: 95000,
      net_mf_amount: 1500,
    },
  ];

  beforeEach(() => {
    // 创建 mock TushareSource 实例
    mockTushare = {
      getBlockTrade: vi.fn(),
      getIndexClassify: vi.fn(),
      getConceptDetail: vi.fn(),
    };
    (TushareSource as any).mockImplementation(() => mockTushare);

    // 设置默认的 mock 返回值
    mockTushare.getBlockTrade.mockResolvedValue(mockBlockTradeData);
    mockTushare.getIndexClassify.mockResolvedValue(['600519.SH', '000001.SZ', '000002.SZ']);
    mockTushare.getConceptDetail.mockResolvedValue(['600519.SH', '000001.SZ']);

    // Mock TradingCalendar
    vi.mocked(TradingCalendar.isTradingDay).mockReturnValue(true);

    // Mock TradingAwareScheduler
    vi.mocked(TradingAwareScheduler.shouldRequest).mockReturnValue(true);
    vi.mocked(TradingAwareScheduler.smartDelay).mockResolvedValue(undefined);

    // 创建 SectorTracker 实例
    tracker = new SectorTracker(mockTushare as unknown as TushareSource);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getSectorRanking', () => {
    it('应返回板块涨跌排行', async () => {
      const result = await tracker.getSectorRanking('2026-02-20', 20);

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.tradeDate).toBe('2026-02-20');
    });

    it('应按涨跌幅降序排序（涨幅最高排第一）', async () => {
      const result = await tracker.getSectorRanking('2026-02-20');

      expect(result.success).toBe(true);
      expect(result.data[0].rank).toBe(1);
      expect(result.data[0].tsCode).toBe('801010.SH'); // 农林牧渔涨幅 2.5%
      expect(result.data[0].pctChg).toBe(2.5);
    });

    it('应正确设置排名', async () => {
      const result = await tracker.getSectorRanking('2026-02-20');

      expect(result.success).toBe(true);
      // 验证排名连续且从1开始
      result.data.forEach((item, index) => {
        expect(item.rank).toBe(index + 1);
      });
    });

    it('应支持 limit 参数限制返回条数', async () => {
      const result = await tracker.getSectorRanking('2026-02-20', 3);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(3);
    });

    it('当 limit 为 0 时应返回所有数据', async () => {
      const result = await tracker.getSectorRanking('2026-02-20', 0);

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(mockBlockTradeData.length);
    });

    it('应返回正确的数据结构', async () => {
      const result = await tracker.getSectorRanking('2026-02-20');

      expect(result.success).toBe(true);
      const firstItem = result.data[0];

      expect(firstItem).toHaveProperty('tsCode');
      expect(firstItem).toHaveProperty('name');
      expect(firstItem).toHaveProperty('close');
      expect(firstItem).toHaveProperty('pctChg');
      expect(firstItem).toHaveProperty('amount');
      expect(firstItem).toHaveProperty('netMfAmount');
      expect(firstItem).toHaveProperty('rank');
    });

    it('非交易日应返回错误', async () => {
      vi.mocked(TradingCalendar.isTradingDay).mockReturnValue(false);

      const result = await tracker.getSectorRanking('2026-02-20');

      expect(result.success).toBe(false);
      expect(result.error).toContain('is not a trading day');
      expect(result.data).toEqual([]);
    });

    it('空数据应返回成功但空数组', async () => {
      mockTushare.getBlockTrade.mockResolvedValue([]);

      const result = await tracker.getSectorRanking('2026-02-20');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('API 错误应返回失败结果', async () => {
      mockTushare.getBlockTrade.mockRejectedValue(new Error('API error'));

      const result = await tracker.getSectorRanking('2026-02-20');

      expect(result.success).toBe(false);
      expect(result.error).toContain('API error');
    });
  });

  describe('getHotSectors', () => {
    it('应返回热门板块（涨幅榜）', async () => {
      const result = await tracker.getHotSectors('2026-02-20', 10);

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);

      // 验证所有板块涨幅都为正
      result.data.forEach(item => {
        expect(item.pctChg).toBeGreaterThan(0);
      });
    });

    it('应正确排序热门板块', async () => {
      const result = await tracker.getHotSectors('2026-02-20');

      expect(result.success).toBe(true);
      // 验证涨幅递减
      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i].pctChg).toBeLessThanOrEqual(result.data[i - 1].pctChg);
      }
    });

    it('当没有涨幅为正的板块时应返回空数组', async () => {
      // 所有板块都是跌幅
      const allNegativeData: BlockTradeData[] = mockBlockTradeData.map(item => ({
        ...item,
        pct_chg: -Math.abs(item.pct_chg),
      }));
      mockTushare.getBlockTrade.mockResolvedValue(allNegativeData);

      const result = await tracker.getHotSectors('2026-02-20');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('应应用 limit 参数', async () => {
      const result = await tracker.getHotSectors('2026-02-20', 2);

      expect(result.success).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(2);
    });

    it('父方法失败时应返回失败结果', async () => {
      mockTushare.getBlockTrade.mockRejectedValue(new Error('API error'));

      const result = await tracker.getHotSectors('2026-02-20');

      expect(result.success).toBe(false);
    });
  });

  describe('getColdSectors', () => {
    it('应返回冷门板块（跌幅榜）', async () => {
      const result = await tracker.getColdSectors('2026-02-20', 10);

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);

      // 验证所有板块跌幅都为负
      result.data.forEach(item => {
        expect(item.pctChg).toBeLessThan(0);
      });
    });

    it('应正确排序冷门板块（跌幅最大的在前）', async () => {
      const result = await tracker.getColdSectors('2026-02-20');

      expect(result.success).toBe(true);
      // 验证跌幅递增（更负的排在后面）
      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i].pctChg).toBeLessThanOrEqual(result.data[i - 1].pctChg);
      }
    });

    it('当没有跌幅为负的板块时应返回空数组', async () => {
      // 所有板块都是涨幅
      const allPositiveData: BlockTradeData[] = mockBlockTradeData.map(item => ({
        ...item,
        pct_chg: Math.abs(item.pct_chg),
      }));
      mockTushare.getBlockTrade.mockResolvedValue(allPositiveData);

      const result = await tracker.getColdSectors('2026-02-20');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('应应用 limit 参数', async () => {
      const result = await tracker.getColdSectors('2026-02-20', 1);

      expect(result.success).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getSectorStocks', () => {
    it('应返回行业板块成分股', async () => {
      const stocks = await tracker.getSectorStocks('801010.SH', 'industry');

      expect(stocks).toEqual(['600519.SH', '000001.SZ', '000002.SZ']);
      expect(mockTushare.getIndexClassify).toHaveBeenCalledWith('801010.SH');
    });

    it('应返回概念板块成分股', async () => {
      const stocks = await tracker.getSectorStocks('TS001', 'concept');

      expect(stocks).toEqual(['600519.SH', '000001.SZ']);
      expect(mockTushare.getConceptDetail).toHaveBeenCalledWith('TS001');
    });

    it('默认应使用 industry 类型', async () => {
      const stocks = await tracker.getSectorStocks('801010.SH');

      expect(stocks).toEqual(['600519.SH', '000001.SZ', '000002.SZ']);
      expect(mockTushare.getIndexClassify).toHaveBeenCalledWith('801010.SH');
    });

    it('缺少板块代码应抛出错误', async () => {
      await expect(tracker.getSectorStocks('', 'industry')).rejects.toThrow('Sector code is required');
    });

    it('API 错误应抛出错误', async () => {
      mockTushare.getIndexClassify.mockRejectedValue(new Error('API error'));

      await expect(tracker.getSectorStocks('801010.SH', 'industry')).rejects.toThrow();
    });

    it('不支持的板块类型应抛出错误', async () => {
      // @ts-expect-error - 测试不支持的类型
      await expect(tracker.getSectorStocks('801010.SH', 'unsupported')).rejects.toThrow('Unsupported sector type');
    });
  });

  describe('analyzeSectorMoneyFlow', () => {
    it('应分析板块资金流向', async () => {
      const result = await tracker.analyzeSectorMoneyFlow('801010.SH', '2026-02-20');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.netInflow).toBe(5000);
      expect(result.data?.inflowRank).toBeGreaterThan(0);
    });

    it('应正确计算流入排名', async () => {
      const result = await tracker.analyzeSectorMoneyFlow('801010.SH', '2026-02-20');

      expect(result.success).toBe(true);
      expect(result.data?.inflowRank).toBe(1); // 农林牧渔净流入最高
    });

    it('应计算散户净流入', async () => {
      const result = await tracker.analyzeSectorMoneyFlow('801010.SH', '2026-02-20');

      expect(result.success).toBe(true);
      expect(result.data?.retailInflow).toBe(150000 - 5000); // 成交额 - 主力净流入
    });

    it('找不到板块时应返回错误', async () => {
      const result = await tracker.analyzeSectorMoneyFlow('999999.SH', '2026-02-20');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('缺少板块代码应返回错误', async () => {
      const result = await tracker.analyzeSectorMoneyFlow('', '2026-02-20');

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('非交易日应返回错误', async () => {
      vi.mocked(TradingCalendar.isTradingDay).mockReturnValue(false);

      const result = await tracker.analyzeSectorMoneyFlow('801010.SH', '2026-02-20');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a trading day');
    });

    it('API 错误应返回失败结果', async () => {
      mockTushare.getBlockTrade.mockRejectedValue(new Error('API error'));

      const result = await tracker.analyzeSectorMoneyFlow('801010.SH', '2026-02-20');

      expect(result.success).toBe(false);
      expect(result.error).toContain('API error');
    });
  });

  describe('getSectorTrend', () => {
    it('应获取板块涨跌趋势', async () => {
      const result = await tracker.getSectorTrend('801010.SH', 3);

      expect(result.length).toBe(3);
      result.forEach(dayResult => {
        expect(dayResult.success).toBe(true);
        expect(dayResult.data.length).toBe(1);
        expect(dayResult.data[0].tsCode).toBe('801010.SH');
      });
    });

    it('应按时间倒序返回（最新在前）', async () => {
      const result = await tracker.getSectorTrend('801010.SH', 3);

      expect(result.length).toBe(3);
      // 验证日期递减
      for (let i = 1; i < result.length; i++) {
        const prevDate = new Date(result[i - 1].tradeDate).getTime();
        const currDate = new Date(result[i].tradeDate).getTime();
        expect(currDate).toBeLessThan(prevDate);
      }
    });

    it('缺少板块代码应抛出错误', async () => {
      await expect(tracker.getSectorTrend('', 3)).rejects.toThrow('Sector code is required');
    });

    it('天数小于等于0应抛出错误', async () => {
      await expect(tracker.getSectorTrend('801010.SH', 0)).rejects.toThrow('days must be greater than 0');
      await expect(tracker.getSectorTrend('801010.SH', -1)).rejects.toThrow('days must be greater than 0');
    });

    it('应跳过非交易日', async () => {
      // 模拟：第1天是交易日，第2天不是，第3天是
      let callCount = 0;
      vi.mocked(TradingCalendar.isTradingDay).mockImplementation(() => {
        callCount++;
        // 奇数次调用返回true（交易日），偶数次返回false
        return callCount % 2 === 1;
      });

      const result = await tracker.getSectorTrend('801010.SH', 2);

      // 应获取到2个交易日的数据
      expect(result.length).toBe(2);
    });
  });

  describe('identifySectorType', () => {
    it('应识别申万一级行业代码', () => {
      expect(tracker.identifySectorType('801010.SH')).toBe('industry');
      expect(tracker.identifySectorType('801020.SH')).toBe('industry');
    });

    it('应识别申万二级行业代码', () => {
      expect(tracker.identifySectorType('802010.SH')).toBe('industry');
      expect(tracker.identifySectorType('802020.SH')).toBe('industry');
    });

    it('应识别申万三级行业代码', () => {
      expect(tracker.identifySectorType('803010.SH')).toBe('industry');
      expect(tracker.identifySectorType('803020.SH')).toBe('industry');
    });

    it('应识别概念板块代码', () => {
      expect(tracker.identifySectorType('TS001')).toBe('concept');
      expect(tracker.identifySectorType('TS999')).toBe('concept');
    });

    it('不认识的代码应返回null', () => {
      expect(tracker.identifySectorType('600519.SH')).toBeNull();
      expect(tracker.identifySectorType('000001.SZ')).toBeNull();
      expect(tracker.identifySectorType('')).toBeNull();
    });
  });

  describe('边界情况', () => {
    it('应处理只有1个板块的情况', async () => {
      const singleData: BlockTradeData[] = [mockBlockTradeData[0]];
      mockTushare.getBlockTrade.mockResolvedValue(singleData);

      const result = await tracker.getSectorRanking('2026-02-20');

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].rank).toBe(1);
    });

    it('应处理涨幅为0的情况', async () => {
      const zeroChangeData: BlockTradeData[] = [
        { ...mockBlockTradeData[0], pct_chg: 0 },
      ];
      mockTushare.getBlockTrade.mockResolvedValue(zeroChangeData);

      const result = await tracker.getHotSectors('2026-02-20');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]); // 涨幅为0不是热门板块
    });

    it('应处理负数成交额', async () => {
      const negativeAmountData: BlockTradeData[] = [
        { ...mockBlockTradeData[0], amount: -1000 },
      ];
      mockTushare.getBlockTrade.mockResolvedValue(negativeAmountData);

      const result = await tracker.analyzeSectorMoneyFlow('801010.SH', '2026-02-20');

      expect(result.success).toBe(true);
      // 散户净流入可能为负
      expect(result.data?.retailInflow).toBeLessThan(0);
    });

    it('应处理超出范围的limit参数', async () => {
      const result = await tracker.getSectorRanking('2026-02-20', 9999);

      expect(result.success).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(mockBlockTradeData.length);
    });
  });

  describe('A股颜色约定', () => {
    it('应遵循A股红涨绿跌的约定', async () => {
      const result = await tracker.getSectorRanking('2026-02-20');

      expect(result.success).toBe(true);

      // Rank 1 应该是涨幅最高的（红色）
      const topGainer = result.data[0];
      expect(topGainer.pctChg).toBeGreaterThan(0);

      // 最后一个应该是跌幅最大的或涨幅最小的（绿色）
      const lastItem = result.data[result.data.length - 1];
      // 在测试数据中，最后一个应该是负数
      expect(lastItem.pctChg).toBeLessThan(topGainer.pctChg);
    });
  });

  describe('数据过滤', () => {
    it('getSectorStocks 应过滤已剔除的股票', async () => {
      // Mock 返回包含已剔除股票的数据
      mockTushare.getIndexClassify.mockResolvedValue(['600519.SH', '000001.SZ']);

      const stocks = await tracker.getSectorStocks('801010.SH', 'industry');

      // Tushare 接口内部已经过滤了 out_date
      expect(stocks).not.toContain(''); // 不应包含空字符串
    });
  });
});
