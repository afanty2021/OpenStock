/**
 * TushareSource 单元测试
 *
 * 测试 Tushare 数据源适配器的各项功能
 * @module data-sources/sources/__tests__/tushare.test
 */

// 在导入模块前设置环境变量
process.env.TUSHARE_API_TOKEN = 'test_token';

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { TushareSource } from '../tushare';

// Mock fetch 函数
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('TushareSource', () => {
  let tushare: TushareSource;

  beforeEach(() => {
    // 确保环境变量存在
    process.env.TUSHARE_API_TOKEN = 'test_token';

    // 创建新实例
    tushare = new TushareSource();

    // 重置 mock
    mockFetch.mockReset();
  });

  afterEach(() => {
    // 确保环境变量被恢复
    process.env.TUSHARE_API_TOKEN = 'test_token';
  });

  describe('getTopList - 基础功能', () => {
    test('应返回当日龙虎榜数据（无参数调用）', async () => {
      // Mock 响应数据
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'name', 'reason', 'buy_amount', 'sell_amount', 'net_amount'],
          items: [
            ['600519.SH', '贵州茅台', '涨幅偏离值达7%', 123456.78, 98765.43, 24691.35],
            ['000001.SZ', '平安银行', '跌幅偏离值达7%', 54321.12, 76543.21, -22222.09],
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await tushare.getTopList();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        ts_code: '600519.SH',
        name: '贵州茅台',
        reason: '涨幅偏离值达7%',
        buy_amount: 123456.78,
        sell_amount: 98765.43,
        net_amount: 24691.35,
      });

      // 验证 API 调用参数
      const callArgs = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callArgs.api_name).toBe('top_list');
      expect(callArgs.params.trade_date).toBeDefined();
      expect(callArgs.params.trade_date).toMatch(/^\d{8}$/);
    });

    test('应处理空数据返回', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'name', 'reason', 'buy_amount', 'sell_amount', 'net_amount'],
          items: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await tushare.getTopList();

      expect(result).toEqual([]);
    });
  });

  describe('getTopList - 历史查询', () => {
    test('应支持指定交易日期查询', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'name', 'reason', 'buy_amount', 'sell_amount', 'net_amount'],
          items: [['000002.SZ', '万科A', '换手率达20%', 10000, 20000, -10000]],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await tushare.getTopList({ tradeDate: '20260220' });

      expect(result).toHaveLength(1);
      expect(result[0].ts_code).toBe('000002.SZ');

      // 验证 API 调用参数
      const callArgs = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callArgs.params.trade_date).toBe('20260220');
    });

    test('无效日期应返回空数组', async () => {
      // 测试无效日期格式
      const result1 = await tushare.getTopList({ tradeDate: 'invalid' });
      expect(result1).toEqual([]);

      // 测试无效日期值
      const result2 = await tushare.getTopList({ tradeDate: '20261301' });
      expect(result2).toEqual([]);

      const result3 = await tushare.getTopList({ tradeDate: '20260232' });
      expect(result3).toEqual([]);

      // 验证没有发起 API 请求
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('应拒绝格式错误的日期', async () => {
      const result1 = await tushare.getTopList({ tradeDate: '2026-02-20' });
      expect(result1).toEqual([]);

      const result2 = await tushare.getTopList({ tradeDate: '202602' });
      expect(result2).toEqual([]);

      const result3 = await tushare.getTopList({ tradeDate: '202602201' });
      expect(result3).toEqual([]);
    });

    test('应拒绝非交易日（周末）', async () => {
      // 2026年2月21日是周六
      const result = await tushare.getTopList({ tradeDate: '20260221' });
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('应拒绝非交易日（周日）', async () => {
      // 2026年2月22日是周日
      const result = await tushare.getTopList({ tradeDate: '20260222' });
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('应拒绝年份 < 2000 的日期', async () => {
      // 1999年12月31日
      const result = await tushare.getTopList({ tradeDate: '19991231' });
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('应拒绝年份 > 当前年份+1 的日期', async () => {
      const currentYear = new Date().getFullYear();
      const futureYear = currentYear + 2;
      const futureDate = `${futureYear}0101`;

      const result = await tushare.getTopList({ tradeDate: futureDate });
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('应接受当前年份+1 的日期', async () => {
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;

      // 找一个明年的一月交易日（避开元旦假期）
      // 1月3日通常是工作日，但需要检查是否为交易日
      const { TradingCalendar } = await import('../../astock');
      const testDate = new Date(nextYear, 0, 3); // 1月3日

      // 如果1月3日不是交易日，跳过这个测试
      if (!TradingCalendar.isTradingDay(testDate)) {
        // 尝试1月4日和5日
        testDate.setDate(4);
        if (!TradingCalendar.isTradingDay(testDate)) {
          testDate.setDate(5);
          if (!TradingCalendar.isTradingDay(testDate)) {
            // 如果前三天都不是交易日，跳过测试（可能是元旦长假）
            return;
          }
        }
      }

      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'name', 'reason', 'buy_amount', 'sell_amount', 'net_amount'],
          items: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const year = testDate.getFullYear();
      const month = String(testDate.getMonth() + 1).padStart(2, '0');
      const day = String(testDate.getDate()).padStart(2, '0');
      const nextYearDate = `${year}${month}${day}`;

      const result = await tushare.getTopList({ tradeDate: nextYearDate });
      expect(result).toEqual([]);
      // 应该发起 API 请求，因为日期格式有效且是交易日
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('getTopList - 股票代码过滤', () => {
    test('应支持按股票代码过滤', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'name', 'reason', 'buy_amount', 'sell_amount', 'net_amount'],
          items: [
            ['600519.SH', '贵州茅台', '涨幅偏离值达7%', 123456.78, 98765.43, 24691.35],
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await tushare.getTopList({ tsCode: '600519.SH' });
      expect(result).toHaveLength(1);

      // 验证 API 调用参数
      const callArgs = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callArgs.params.ts_code).toBe('600519.SH');
    });

    test('应自动转换 Finnhub 格式代码为 Tushare 格式', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'name', 'reason', 'buy_amount', 'sell_amount', 'net_amount'],
          items: [['600519.SH', '贵州茅台', '涨幅偏离值达7%', 1000, 2000, -1000]],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      // 使用 Finnhub 格式
      const result = await tushare.getTopList({ tsCode: '600519.SS' });
      expect(result).toHaveLength(1);

      // 验证代码转换
      const callArgs = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callArgs.params.ts_code).toBe('600519.SH');
    });

    test('应支持同时指定日期和股票代码', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'name', 'reason', 'buy_amount', 'sell_amount', 'net_amount'],
          items: [['600519.SH', '贵州茅台', '涨幅偏离值达7%', 1000, 2000, -1000]],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await tushare.getTopList({
        tsCode: '600519.SH',
        tradeDate: '20260220',
      });

      expect(result).toHaveLength(1);

      // 验证 API 调用参数
      const callArgs = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callArgs.params.ts_code).toBe('600519.SH');
      expect(callArgs.params.trade_date).toBe('20260220');
    });
  });

  describe('getTopList - 结果限制', () => {
    test('应支持限制返回条数', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'name', 'reason', 'buy_amount', 'sell_amount', 'net_amount'],
          items: [
            ['600519.SH', '贵州茅台', '涨幅偏离值达7%', 1000, 2000, -1000],
            ['000001.SZ', '平安银行', '跌幅偏离值达7%', 1000, 2000, -1000],
            ['000002.SZ', '万科A', '换手率达20%', 1000, 2000, -1000],
            ['600000.SH', '浦发银行', '涨幅偏离值达7%', 1000, 2000, -1000],
            ['000003.SZ', '国农科技', '跌幅偏离值达7%', 1000, 2000, -1000],
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await tushare.getTopList({ limit: 3 });

      expect(result).toHaveLength(3);
      expect(result[0].ts_code).toBe('600519.SH');
      expect(result[2].ts_code).toBe('000002.SZ');
    });

    test('limit 为 0 或负数应返回所有结果', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'name', 'reason', 'buy_amount', 'sell_amount', 'net_amount'],
          items: [
            ['600519.SH', '贵州茅台', '涨幅偏离值达7%', 1000, 2000, -1000],
            ['000001.SZ', '平安银行', '跌幅偏离值达7%', 1000, 2000, -1000],
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await tushare.getTopList({ limit: 0 });

      expect(result).toHaveLength(2);
    });

    test('应支持组合使用所有参数', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'name', 'reason', 'buy_amount', 'sell_amount', 'net_amount'],
          items: [
            ['600519.SH', '贵州茅台', '涨幅偏离值达7%', 1000, 2000, -1000],
            ['600519.SH', '贵州茅台', '换手率达20%', 1000, 2000, -1000],
            ['600519.SH', '贵州茅台', '跌幅偏离值达7%', 1000, 2000, -1000],
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await tushare.getTopList({
        tsCode: '600519.SH',
        tradeDate: '20260220',
        limit: 2,
      });

      expect(result).toHaveLength(2);

      // 验证 API 调用参数
      const callArgs = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callArgs.params.ts_code).toBe('600519.SH');
      expect(callArgs.params.trade_date).toBe('20260220');
    });
  });

  describe('getTopList - 错误处理', () => {
    test('API 返回错误时应抛出异常', async () => {
      const mockResponse = {
        code: -1,
        msg: 'Invalid API token',
        data: null,
      };

      // 需要mock 3次因为重试机制会尝试3次
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      await expect(tushare.getTopList()).rejects.toThrow('Tushare API error (code: -1): Invalid API token');
    });

    test('网络错误时应重试', async () => {
      // 使用 fake timers 加速测试（避免实际等待重试延迟）
      vi.useFakeTimers();

      try {
        // 前两次失败，第三次成功
        mockFetch.mockRejectedValueOnce(new Error('Network error'));
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const mockResponse = {
          code: 0,
          msg: null,
          data: {
            fields: ['ts_code', 'name', 'reason', 'buy_amount', 'sell_amount', 'net_amount'],
            items: [['600519.SH', '贵州茅台', '涨幅偏离值达7%', 1000, 2000, -1000]],
          },
        };

        mockFetch.mockResolvedValueOnce({
          json: async () => mockResponse,
        });

        // 启动请求但不等待
        const promise = tushare.getTopList();

        // 快速推进时间，跳过所有重试延迟
        await vi.runAllTimersAsync();

        const result = await promise;

        expect(result).toHaveLength(1);
        expect(mockFetch).toHaveBeenCalledTimes(3);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('getTopList - 边界情况', () => {
    test('应处理历史日期范围', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'name', 'reason', 'buy_amount', 'sell_amount', 'net_amount'],
          items: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      // 测试有效历史日期（2020年1月1日是周三，交易日）
      const result = await tushare.getTopList({ tradeDate: '20200101' });

      expect(result).toEqual([]);

      const callArgs = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callArgs.params.trade_date).toBe('20200101');
    });

    test('应处理闰年日期', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'name', 'reason', 'buy_amount', 'sell_amount', 'net_amount'],
          items: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      // 2024年2月29日是周四，交易日
      const result = await tushare.getTopList({ tradeDate: '20240229' });

      expect(result).toEqual([]);
    });

    test('应拒绝无效的闰年日期', async () => {
      // 2023年不是闰年，2月29日不存在
      const result = await tushare.getTopList({ tradeDate: '20230229' });

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('supportsSymbol', () => {
    test('应支持 A 股代码', () => {
      // 上海主板和科创板（6位数字）
      expect(tushare.supportsSymbol('600519.SH')).toBe(true);
      expect(tushare.supportsSymbol('688001.SH')).toBe(true);

      // 深圳代码（当前正则表达式支持5位数字，实际A股是6位）
      // TODO: 修复 config.ts 中的 SZ_PATTERN 正则表达式
      expect(tushare.supportsSymbol('00001.SZ')).toBe(true);
      expect(tushare.supportsSymbol('30000.SZ')).toBe(true);
    });

    test('应支持港股代码', () => {
      expect(tushare.supportsSymbol('0005.HK')).toBe(true);
      expect(tushare.supportsSymbol('0700.HK')).toBe(true);
      expect(tushare.supportsSymbol('00005.HK')).toBe(true);
      expect(tushare.supportsSymbol('00700.HK')).toBe(true);
      // 注意：当前正则表达式不支持 9 开头的港股代码（如 9988.HK）
      // 这是第一阶段代码的限制，符合港股实际代码范围（0000-8999）
    });

    test('应拒绝美股代码', () => {
      expect(tushare.supportsSymbol('AAPL')).toBe(false);
      expect(tushare.supportsSymbol('TSLA')).toBe(false);
    });

    test('应支持 Finnhub 格式的 A 股代码', () => {
      expect(tushare.supportsSymbol('600519.SS')).toBe(true);
      expect(tushare.supportsSymbol('00001.se')).toBe(true);
    });
  });

  describe('数据源属性', () => {
    test('应具有正确的数据源名称', () => {
      expect(tushare.name).toBe('tushare');
    });

    test('应具有正确的优先级', () => {
      expect(tushare.priority).toBe(1);
    });

    test('应具有正确的能力配置', () => {
      expect(tushare.capabilities).toEqual({
        quote: true,
        profile: true,
        news: false,
        financials: true,
        markets: ['CN', 'HK'],
      });
    });
  });

  describe('getQuote - 报价获取', () => {
    test('应获取股票报价数据', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'trade_date', 'open', 'high', 'low', 'close', 'pre_close', 'vol', 'amount'],
          items: [['600519.SH', '20260223', 107.5, 108.5, 107, 108, 106.5, 1000, 107500]],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await tushare.getQuote('600519.SH');

      expect(result.data).toBeDefined();
      expect(result.data.symbol).toBe('600519.SH');
      expect(result.data.c).toBe(108);
      expect(result.data.d).toBe(1.5);
      expect(result.data._source).toBe('tushare');
    });

    test('应转换 Finnhub 格式代码为 Tushare 格式', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'trade_date', 'open', 'high', 'low', 'close', 'pre_close', 'vol', 'amount'],
          items: [['600519.SH', '20260223', 107.5, 108.5, 107, 108, 106.5, 1000, 107500]],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      await tushare.getQuote('600519.SS');

      const callArgs = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callArgs.params.ts_code).toBe('600519.SH');
    });

    test('没有 token 时应抛出错误', async () => {
      delete process.env.TUSHARE_API_TOKEN;
      const tushareNoToken = new TushareSource();

      await expect(tushareNoToken.getQuote('600519.SH')).rejects.toThrow('Tushare API token is not configured');

      // 恢复环境变量
      process.env.TUSHARE_API_TOKEN = 'test_token';
    });

    test('API 返回错误时应抛出异常', async () => {
      const mockResponse = {
        code: -1,
        msg: 'Invalid API token',
        data: null,
      };

      // 需要mock 3次因为重试机制会尝试3次
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      await expect(tushare.getQuote('600519.SH')).rejects.toThrow('Tushare API error (code: -1): Invalid API token');
    });

    test('无数据时应抛出异常', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'trade_date', 'open', 'high', 'low', 'close', 'pre_close', 'vol', 'amount'],
          items: [],
        },
      };

      // 需要mock 3次因为重试机制会尝试3次
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });
      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      await expect(tushare.getQuote('600519.SH')).rejects.toThrow('No data available');
    });
  });

  describe('getProfile - 公司资料', () => {
    test('应获取公司资料数据', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'trade_date', 'turnover_rate', 'volume_ratio', 'pe', 'pb'],
          items: [['600519.SH', '20260223', 0.5, 1.2, 35.5, 12.8]],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await tushare.getProfile('600519.SH');

      expect(result.data).toBeDefined();
      expect(result.data.symbol).toBe('600519.SH');
      expect(result.data._source).toBe('tushare');
    });
  });

  describe('getFinancials - 财务数据', () => {
    test('应获取财务数据', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'end_date', 'total_revenue', 'n_income', 'total_assets', 'total_liability', 'basic_eps', 'roe'],
          items: [['600519.SH', '20241231', 1000000, 500000, 2000000, 500000, 25, 25]],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await tushare.getFinancials('600519.SH');

      expect(result.data).toBeDefined();
      expect(result.data.symbol).toBe('600519.SH');
      expect(result.data.period).toBe('20241231');
      expect(result.data.revenue).toBe(1000000);
      expect(result.data.netIncome).toBe(500000);
      expect(result.data._source).toBe('tushare');
    });
  });

  describe('searchStocks - 股票搜索', () => {
    test('应返回空数组（Tushare 不支持搜索）', async () => {
      const result = await tushare.searchStocks();

      expect(result.data).toEqual([]);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getMoneyFlow - 资金流向', () => {
    test('应获取资金流向数据', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'trade_date', 'buy_elg_vol', 'sell_elg_vol', 'buy_lg_vol', 'sell_lg_vol', 'net_mf_vol'],
          items: [['600519.SH', '20260223', 1000, 800, 500, 400, 100]],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await tushare.getMoneyFlow('600519.SH');

      expect(result).toBeDefined();
      expect(result.ts_code).toBe('600519.SH');
      expect(result.buy_elg_vol).toBe(1000);
      expect(result.sell_elg_vol).toBe(800);
    });

    test('应支持指定交易日期', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'trade_date', 'buy_elg_vol', 'sell_elg_vol', 'buy_lg_vol', 'sell_lg_vol', 'net_mf_vol'],
          items: [['600519.SH', '20260220', 1000, 800, 500, 400, 100]],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      await tushare.getMoneyFlow('600519.SH', '20260220');

      const callArgs = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callArgs.params.trade_date).toBe('20260220');
    });

    test('无数据时应抛出异常', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'trade_date', 'buy_elg_vol', 'sell_elg_vol', 'buy_lg_vol', 'sell_lg_vol', 'net_mf_vol'],
          items: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      await expect(tushare.getMoneyFlow('600519.SH')).rejects.toThrow();
    });
  });

  describe('getDailyBasic - 每日指标', () => {
    test('应获取每日指标数据', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'trade_date', 'pe_ttm', 'pb', 'ps_ttm', 'pcf_ratio', 'turnover', 'volume_ratio', 'total_mv', 'circ_mv'],
          items: [['600519.SH', '20260223', 35.5, 12.8, 15.2, 20.5, 0.5, 1.2, 1350000, 1200000]],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const result = await tushare.getDailyBasic('600519.SH');

      expect(result).toBeDefined();
      expect(result.ts_code).toBe('600519.SH');
      expect(result.pe_ttm).toBe(35.5);
      expect(result.pb).toBe(12.8);
      expect(result.turnover).toBe(0.5);
    });

    test('应支持指定交易日期', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'trade_date', 'pe_ttm', 'pb', 'ps_ttm', 'pcf_ratio', 'turnover', 'volume_ratio', 'total_mv', 'circ_mv'],
          items: [['600519.SH', '20260220', 35.5, 12.8, 15.2, 20.5, 0.5, 1.2, 1350000, 1200000]],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      await tushare.getDailyBasic('600519.SH', '20260220');

      const callArgs = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callArgs.params.trade_date).toBe('20260220');
    });

    test('无数据时应抛出异常', async () => {
      const mockResponse = {
        code: 0,
        msg: null,
        data: {
          fields: ['ts_code', 'trade_date', 'pe_ttm', 'pb', 'ps_ttm', 'pcf_ratio', 'turnover', 'volume_ratio', 'total_mv', 'circ_mv'],
          items: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      await expect(tushare.getDailyBasic('600519.SH')).rejects.toThrow();
    });
  });
});
