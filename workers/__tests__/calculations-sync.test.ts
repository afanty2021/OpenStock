/**
 * 同步计算函数测试
 */

import { describe, it, expect } from 'vitest';
import {
  calculateLimitPriceSync,
  calculateMASync,
  calculateRSISync,
  calculateBollingerBandsSync,
} from '../calculations-sync';
import type { KLineData } from '../calculations';

describe('同步计算函数', () => {
  describe('calculateLimitPriceSync', () => {
    it('应该正确计算主板的涨跌停价格', () => {
      const result = calculateLimitPriceSync({
        prevClose: 100,
        isST: false,
        isStar: false,
        isChiNext: false,
        isBJ: false,
      });

      expect(result.upperLimit).toBeCloseTo(110, 10); // 10% 涨停（使用 closeTo 处理浮点数精度）
      expect(result.lowerLimit).toBeCloseTo(90, 10); // 10% 跌停
      expect(result.upperLimitPercent).toBe(10);
      expect(result.lowerLimitPercent).toBe(-10);
    });

    it('应该正确计算 ST 股票的涨跌停价格', () => {
      const result = calculateLimitPriceSync({
        prevClose: 100,
        isST: true,
      });

      expect(result.upperLimit).toBe(105); // 5% 涨停
      expect(result.lowerLimit).toBe(95); // 5% 跌停
      expect(result.upperLimitPercent).toBe(5);
      expect(result.lowerLimitPercent).toBe(-5);
    });

    it('应该正确计算科创板的涨跌停价格', () => {
      const result = calculateLimitPriceSync({
        prevClose: 100,
        isStar: true,
      });

      expect(result.upperLimit).toBe(120); // 20% 涨停
      expect(result.lowerLimit).toBe(80); // 20% 跌停
      expect(result.upperLimitPercent).toBe(20);
      expect(result.lowerLimitPercent).toBe(-20);
    });

    it('应该正确计算创业板的涨跌停价格', () => {
      const result = calculateLimitPriceSync({
        prevClose: 100,
        isChiNext: true,
      });

      expect(result.upperLimit).toBe(120); // 20% 涨停
      expect(result.lowerLimit).toBe(80); // 20% 跌停
    });

    it('应该正确计算北交所的涨跌停价格', () => {
      const result = calculateLimitPriceSync({
        prevClose: 100,
        isBJ: true,
      });

      expect(result.upperLimit).toBe(130); // 30% 涨停
      expect(result.lowerLimit).toBe(70); // 30% 跌停
      expect(result.upperLimitPercent).toBe(30);
      expect(result.lowerLimitPercent).toBe(-30);
    });
  });

  describe('calculateMASync', () => {
    it('应该正确计算简单移动平均线', () => {
      const data: KLineData[] = [
        { timestamp: 1, open: 10, high: 12, low: 9, close: 11 },
        { timestamp: 2, open: 11, high: 13, low: 10, close: 12 },
        { timestamp: 3, open: 12, high: 14, low: 11, close: 13 },
        { timestamp: 4, open: 13, high: 15, low: 12, close: 14 },
        { timestamp: 5, open: 14, high: 16, low: 13, close: 15 },
      ];

      const result = calculateMASync({
        data,
        periods: [3, 5],
      });

      expect(result['3']).toHaveLength(5);
      expect(result['3'][0]).toBeNaN(); // 前两个值应该为 NaN
      expect(result['3'][1]).toBeNaN();
      expect(result['3'][2]).toBe(12); // (11 + 12 + 13) / 3
      expect(result['3'][3]).toBe(13); // (12 + 13 + 14) / 3
      expect(result['3'][4]).toBe(14); // (13 + 14 + 15) / 3

      expect(result['5']).toHaveLength(5);
      expect(result['5'][0]).toBeNaN();
      expect(result['5'][1]).toBeNaN();
      expect(result['5'][2]).toBeNaN();
      expect(result['5'][3]).toBeNaN();
      expect(result['5'][4]).toBe(13); // (11 + 12 + 13 + 14 + 15) / 5
    });
  });

  describe('calculateRSISync', () => {
    it('应该正确计算 RSI 指标', () => {
      const data: KLineData[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        open: 100 + i,
        high: 102 + i,
        low: 99 + i,
        close: 101 + i, // 每天上涨 1
      }));

      const result = calculateRSISync({
        data,
        period: 14,
      });

      expect(result.values).toBeDefined();
      expect(result.values.length).toBeGreaterThan(0);
      // 所有值应该接近 100，因为一直在涨
      expect(result.values[result.values.length - 1]).toBeGreaterThan(70);
    });

    it('应该正确识别超买和超卖区域', () => {
      const data: KLineData[] = Array.from({ length: 20 }, (_, i) => ({
        timestamp: i,
        open: 100 + i * 2,
        high: 102 + i * 2,
        low: 99 + i * 2,
        close: 101 + i * 2,
      }));

      const result = calculateRSISync({
        data,
        period: 14,
      });

      expect(result.overbought).toBeDefined();
      expect(result.oversold).toBeDefined();
    });
  });

  describe('calculateBollingerBandsSync', () => {
    it('应该正确计算布林带', () => {
      // 使用有变化的数据，确保标准差不为 0
      const data: KLineData[] = Array.from({ length: 30 }, (_, i) => ({
        timestamp: i,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 100 + i,
      }));

      const result = calculateBollingerBandsSync({
        data,
        period: 20,
        stdDev: 2,
      });

      expect(result.upper).toHaveLength(30);
      expect(result.middle).toHaveLength(30);
      expect(result.lower).toHaveLength(30);
      expect(result.bandwidth).toHaveLength(30);

      // 前 19 个值应该为 NaN
      for (let i = 0; i < 19; i++) {
        expect(result.upper[i]).toBeNaN();
        expect(result.middle[i]).toBeNaN();
        expect(result.lower[i]).toBeNaN();
        expect(result.bandwidth[i]).toBeNaN();
      }

      // 第 20 个值应该有有效数据
      expect(result.upper[19]).not.toBeNaN();
      expect(result.middle[19]).not.toBeNaN();
      expect(result.lower[19]).not.toBeNaN();

      // 上轨应该高于中轨
      expect(result.upper[19]).toBeGreaterThan(result.middle[19]);
      // 下轨应该低于中轨
      expect(result.lower[19]).toBeLessThan(result.middle[19]);
    });
  });
});
