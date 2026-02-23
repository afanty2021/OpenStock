import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies at module level
vi.mock('@/lib/data-sources/astock/trading-calendar', () => ({
  TradingCalendar: {
    isTradingDay: vi.fn().mockReturnValue(true),
    isHoliday: vi.fn().mockReturnValue(false),
  },
}));

// Mock TushareSource before importing the module under test
vi.mock('@/lib/data-sources', () => {
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
    TushareSource: vi.fn().mockImplementation(() => ({
      getTopList: mockGetTopList,
    })),
    __mockGetTopList: mockGetTopList,
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
      expect(result.data).toHaveLength(1);
      expect(result.data[0].tsCode).toBe('600519.SH');
    });

    it('should convert yuan amounts to wan yuan', async () => {
      const { getTopListData } = await import('../toplist.actions');
      const result = await getTopListData();

      expect(result.data[0].buyAmount).toBe(50000);
      expect(result.data[0].sellAmount).toBe(20000);
      expect(result.data[0].netAmount).toBe(30000);
    });

    it('should include rank field', async () => {
      const { getTopListData } = await import('../toplist.actions');
      const result = await getTopListData();

      expect(result.data[0]).toHaveProperty('rank');
    });

    it('should include tradeDate field', async () => {
      const { getTopListData } = await import('../toplist.actions');
      const result = await getTopListData();

      expect(result.data[0].tradeDate).toBe('2026-02-21');
    });
  });
});
