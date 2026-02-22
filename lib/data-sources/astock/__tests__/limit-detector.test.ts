/**
 * LimitDetector 单元测试
 *
 * 测试涨跌停检测和预测功能
 * @module data-sources/astock/__tests__/limit-detector.test
 */

import { describe, test, expect } from 'vitest';
import { LimitDetector, LimitStatus, LimitPrediction } from '../limit-detector';
import { QuoteData } from '@/lib/data-sources/types';

/**
 * 创建测试用的 QuoteData
 */
function createQuote(overrides: Partial<QuoteData> = {}): QuoteData {
  return {
    symbol: '600519.SH',
    c: 110,
    pc: 100,
    dp: 10,
    d: 10,
    h: 110,
    l: 100,
    o: 100,
    t: Date.now() / 1000,
    _source: 'test',
    ...overrides,
  };
}

describe('LimitDetector', () => {
  describe('detectLimitStatus', () => {
    describe('主板股票 (10% 涨跌停)', () => {
      test('应检测到涨停状态 (10%)', () => {
        const quote = createQuote({
          symbol: '600519.SH',
          pc: 100,
          c: 110,
          dp: 10,
        });
        expect(LimitDetector.detectLimitStatus(quote)).toBe('UPPER');
      });

      test('应检测到涨停状态 (考虑容差)', () => {
        const quote = createQuote({
          symbol: '600519.SH',
          pc: 100,
          c: 109.95,
          dp: 9.95,
        });
        expect(LimitDetector.detectLimitStatus(quote)).toBe('UPPER');
      });

      test('应检测到跌停状态 (-10%)', () => {
        const quote = createQuote({
          symbol: '600519.SH',
          pc: 100,
          c: 90,
          dp: -10,
        });
        expect(LimitDetector.detectLimitStatus(quote)).toBe('LOWER');
      });

      test('应检测到跌停状态 (考虑容差)', () => {
        const quote = createQuote({
          symbol: '600519.SH',
          pc: 100,
          c: 90.05,
          dp: -9.95,
        });
        expect(LimitDetector.detectLimitStatus(quote)).toBe('LOWER');
      });

      test('应检测到正常状态', () => {
        const quote = createQuote({
          symbol: '600519.SH',
          pc: 100,
          c: 105,
          dp: 5,
        });
        expect(LimitDetector.detectLimitStatus(quote)).toBe('NORMAL');
      });
    });

    describe('科创板/创业板 (20% 涨跌停)', () => {
      test('应检测到涨停状态 (20%)', () => {
        const quote = createQuote({
          symbol: '688001.SH',
          pc: 100,
          c: 120,
          dp: 20,
        });
        expect(LimitDetector.detectLimitStatus(quote)).toBe('UPPER');
      });

      test('应检测到跌停状态 (-20%)', () => {
        const quote = createQuote({
          symbol: '300001.SZ',
          pc: 100,
          c: 80,
          dp: -20,
        });
        expect(LimitDetector.detectLimitStatus(quote)).toBe('LOWER');
      });

      test('应检测到正常状态', () => {
        const quote = createQuote({
          symbol: '688001.SH',
          pc: 100,
          c: 110,
          dp: 10,
        });
        expect(LimitDetector.detectLimitStatus(quote)).toBe('NORMAL');
      });
    });

    describe('北交所 (30% 涨跌停)', () => {
      test('应检测到涨停状态 (30%)', () => {
        const quote = createQuote({
          symbol: '832566.BJ',
          pc: 100,
          c: 130,
          dp: 30,
        });
        expect(LimitDetector.detectLimitStatus(quote)).toBe('UPPER');
      });

      test('应检测到跌停状态 (-30%)', () => {
        const quote = createQuote({
          symbol: '832566.BJ',
          pc: 100,
          c: 70,
          dp: -30,
        });
        expect(LimitDetector.detectLimitStatus(quote)).toBe('LOWER');
      });
    });

    describe('边界情况', () => {
      test('应处理零涨幅', () => {
        const quote = createQuote({
          symbol: '600519.SH',
          pc: 100,
          c: 100,
          dp: 0,
        });
        expect(LimitDetector.detectLimitStatus(quote)).toBe('NORMAL');
      });

      test('应处理非常小的涨幅', () => {
        const quote = createQuote({
          symbol: '600519.SH',
          pc: 100,
          c: 100.01,
          dp: 0.01,
        });
        expect(LimitDetector.detectLimitStatus(quote)).toBe('NORMAL');
      });

      test('应处理接近涨停但未达到的情况', () => {
        const quote = createQuote({
          symbol: '600519.SH',
          pc: 100,
          c: 109.9,
          dp: 9.9,
        });
        expect(LimitDetector.detectLimitStatus(quote)).toBe('NORMAL');
      });
    });
  });

  describe('predictLimitDistance', () => {
    describe('主板股票 (10% 涨跌停)', () => {
      test('应正确预测距离涨停的距离', () => {
        const quote = createQuote({
          symbol: '600519.SH',
          pc: 100,
          c: 108,
          dp: 8,
        });

        const prediction = LimitDetector.predictLimitDistance(quote);

        // 距离涨停 2%，小于 10% * 0.3 = 3%，可触及
        expect(prediction.toUpper.pct).toBeCloseTo(2, 1);
        expect(prediction.toUpper.price).toBeCloseTo(2, 1);
        expect(prediction.toUpper.reachable).toBe(true);

        expect(prediction.toLower.pct).toBeCloseTo(18, 1);
        expect(prediction.toLower.price).toBeCloseTo(18, 1);
        expect(prediction.toLower.reachable).toBe(false);
      });

      test('应正确预测距离跌停的距离', () => {
        const quote = createQuote({
          symbol: '600519.SH',
          pc: 100,
          c: 92,
          dp: -8,
        });

        const prediction = LimitDetector.predictLimitDistance(quote);

        expect(prediction.toUpper.pct).toBeCloseTo(18, 1);
        expect(prediction.toUpper.price).toBeCloseTo(18, 1);
        expect(prediction.toUpper.reachable).toBe(false);

        // 距离跌停 2%，小于 10% * 0.3 = 3%，可触及
        expect(prediction.toLower.pct).toBeCloseTo(2, 1);
        expect(prediction.toLower.price).toBeCloseTo(2, 1);
        expect(prediction.toLower.reachable).toBe(true);
      });

      test('应正确处理涨停状态', () => {
        const quote = createQuote({
          symbol: '600519.SH',
          pc: 100,
          c: 110,
          dp: 10,
        });

        const prediction = LimitDetector.predictLimitDistance(quote);

        expect(prediction.toUpper.pct).toBeCloseTo(0, 1);
        expect(prediction.toUpper.price).toBeCloseTo(0, 1);
        expect(prediction.toUpper.reachable).toBe(false);

        expect(prediction.toLower.pct).toBeCloseTo(20, 1);
        expect(prediction.toLower.price).toBeCloseTo(20, 1);
        expect(prediction.toLower.reachable).toBe(false);
      });

      test('应正确计算涨停价和跌停价', () => {
        const quote = createQuote({
          symbol: '600519.SH',
          pc: 100,
          c: 100,
          dp: 0,
        });

        const prediction = LimitDetector.predictLimitDistance(quote);

        // 涨停价 = 100 * 1.1 = 110
        expect(prediction.toUpper.price).toBeCloseTo(10, 1);
        // 跌停价 = 100 * 0.9 = 90
        expect(prediction.toLower.price).toBeCloseTo(10, 1);
      });
    });

    describe('科创板/创业板 (20% 涨跌停)', () => {
      test('应正确预测距离涨停的距离 (20%)', () => {
        const quote = createQuote({
          symbol: '688001.SH',
          pc: 100,
          c: 116,
          dp: 16,
        });

        const prediction = LimitDetector.predictLimitDistance(quote);

        // 距离涨停 4%，小于 20% * 0.3 = 6%，可触及
        expect(prediction.toUpper.pct).toBeCloseTo(4, 1);
        expect(prediction.toUpper.price).toBeCloseTo(4, 1);
        expect(prediction.toUpper.reachable).toBe(true);

        expect(prediction.toLower.pct).toBeCloseTo(36, 1);
        expect(prediction.toLower.price).toBeCloseTo(36, 1);
        expect(prediction.toLower.reachable).toBe(false);
      });
    });

    describe('北交所 (30% 涨跌停)', () => {
      test('应正确预测距离涨停的距离 (30%)', () => {
        const quote = createQuote({
          symbol: '832566.BJ',
          pc: 100,
          c: 123,
          dp: 23,
        });

        const prediction = LimitDetector.predictLimitDistance(quote);

        // 距离涨停 7%，小于 30% * 0.3 = 9%，可触及
        expect(prediction.toUpper.pct).toBeCloseTo(7, 1);
        expect(prediction.toUpper.price).toBeCloseTo(7, 1);
        expect(prediction.toUpper.reachable).toBe(true);
      });
    });

    describe('可触及性判断', () => {
      test('应判断是否可触及涨停', () => {
        const quote = createQuote({
          symbol: '600519.SH',
          pc: 100,
          c: 107,
          dp: 7,
        });

        const prediction = LimitDetector.predictLimitDistance(quote);

        // 距离涨停 3%，小于 10% * 0.3 = 3%，可触及
        expect(prediction.toUpper.reachable).toBe(true);
        expect(prediction.toLower.reachable).toBe(false);
      });

      test('应判断不可触及涨停 (距离太远)', () => {
        const quote = createQuote({
          symbol: '600519.SH',
          pc: 100,
          c: 102,
          dp: 2,
        });

        const prediction = LimitDetector.predictLimitDistance(quote);

        // 距离涨停 8%，大于 10% * 0.3 = 3%，不可触及
        expect(prediction.toUpper.reachable).toBe(false);
      });

      test('应处理已涨停状态', () => {
        const quote = createQuote({
          symbol: '600519.SH',
          pc: 100,
          c: 110,
          dp: 10,
        });

        const prediction = LimitDetector.predictLimitDistance(quote);

        // 已涨停，不可触及
        expect(prediction.toUpper.reachable).toBe(false);
      });

      test('应处理已跌停状态', () => {
        const quote = createQuote({
          symbol: '600519.SH',
          pc: 100,
          c: 90,
          dp: -10,
        });

        const prediction = LimitDetector.predictLimitDistance(quote);

        // 已跌停，不可触及
        expect(prediction.toLower.reachable).toBe(false);
      });
    });
  });

  describe('isNearLimit', () => {
    test('应使用默认阈值 (0.7 / 70%)', () => {
      const quote = createQuote({
        symbol: '600519.SH',
        pc: 100,
        c: 107,
        dp: 7,
      });

      // 距离涨停 3% < 10% * 0.3 = 3%，接近
      expect(LimitDetector.isNearLimit(quote)).toBe(true);
    });

    test('应支持自定义阈值', () => {
      const quote = createQuote({
        symbol: '600519.SH',
        pc: 100,
        c: 105,
        dp: 5,
      });

      // 使用阈值 0.5 (50%)，距离涨停 5% < 10% * 0.5 = 5%，接近
      expect(LimitDetector.isNearLimit(quote, 0.5)).toBe(true);
    });

    test('应判断不接近涨跌停', () => {
      const quote = createQuote({
        symbol: '600519.SH',
        pc: 100,
        c: 102,
        dp: 2,
      });

      // 距离涨停 8% > 10% * 0.3 = 3%，不接近
      expect(LimitDetector.isNearLimit(quote)).toBe(false);
    });

    test('应判断接近跌停', () => {
      const quote = createQuote({
        symbol: '600519.SH',
        pc: 100,
        c: 93,
        dp: -7,
      });

      // 距离跌停 3% < 10% * 0.3 = 3%，接近
      expect(LimitDetector.isNearLimit(quote)).toBe(true);
    });

    test('应处理已涨停状态', () => {
      const quote = createQuote({
        symbol: '600519.SH',
        pc: 100,
        c: 110,
        dp: 10,
      });

      expect(LimitDetector.isNearLimit(quote)).toBe(false);
    });

    test('应处理已跌停状态', () => {
      const quote = createQuote({
        symbol: '600519.SH',
        pc: 100,
        c: 90,
        dp: -10,
      });

      expect(LimitDetector.isNearLimit(quote)).toBe(false);
    });
  });

  describe('边界情况', () => {
    test('应处理非 A 股代码', () => {
      const quote = createQuote({
        symbol: 'AAPL',
        pc: 100,
        c: 110,
        dp: 10,
      });

      // 非 A 股股票，涨跌停限制为 0%
      expect(LimitDetector.detectLimitStatus(quote)).toBe('NORMAL');
    });

    test('应处理负数价格 (异常数据)', () => {
      const quote = createQuote({
        symbol: '600519.SH',
        pc: 100,
        c: -1,
        dp: -101,
      });

      // 异常数据，应返回正常状态
      expect(LimitDetector.detectLimitStatus(quote)).toBe('NORMAL');
    });

    test('应处理零前收盘价', () => {
      const quote = createQuote({
        symbol: '600519.SH',
        pc: 0,
        c: 0,
        dp: 0,
      });

      // 零前收盘价，应返回正常状态
      expect(LimitDetector.detectLimitStatus(quote)).toBe('NORMAL');
    });
  });
});
