import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies at module level
vi.mock('@/lib/data-sources/astock/trading-calendar', () => ({
  TradingCalendar: {
    isTradingDay: vi.fn().mockReturnValue(true),
    isHoliday: vi.fn().mockReturnValue(false),
  },
}));

// Mock TushareSource before importing the module under test
vi.mock('@/lib/data-sources/sources/tushare', () => {
  const mockGetTopList = vi.fn().mockResolvedValue([
    {
      ts_code: '600519.SH',
      name: '贵州茅台',
      reason: '机构买入',
      buy_amount: 500000000,
      sell_amount: 200000000,
      net_amount: 300000000,
      trade_date: '20260221',
    },
  ]);

  return {
    TushareSource: class {
      getTopList = mockGetTopList;
    },
  };
});

describe('toplist.actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTopListData', () => {
    it('should return success with data when API call succeeds', async () => {
      const { getTopListData } = await import('../toplist.actions');
      const result = await getTopListData();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].tsCode).toBe('600519.SH');
    });

    it('should include amount fields', async () => {
      const { getTopListData } = await import('../toplist.actions');
      const result = await getTopListData();

      expect(result.data[0].buyAmount).toBe(500000000);
      expect(result.data[0].sellAmount).toBe(200000000);
      expect(result.data[0].netAmount).toBe(300000000);
    });

    it('should include rank field', async () => {
      const { getTopListData } = await import('../toplist.actions');
      const result = await getTopListData();

      expect(result.data[0]).toHaveProperty('rank');
    });

    it('should include tradeDate field', async () => {
      const { getTopListData } = await import('../toplist.actions');
      const result = await getTopListData();

      // 验证日期格式为 YYYY-MM-DD
      expect(result.data[0].tradeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
