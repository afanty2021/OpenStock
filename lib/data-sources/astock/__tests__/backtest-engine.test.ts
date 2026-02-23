/**
 * 回测引擎单元测试
 * @module data-sources/astock/__tests__/backtest-engine.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BacktestEngine,
  getBacktestEngine,
  type BacktestConfig,
  type BacktestResult,
} from '../backtest-engine';

describe('BacktestEngine', () => {
  let engine: BacktestEngine;

  beforeEach(() => {
    engine = new BacktestEngine();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const e = new BacktestEngine();
      expect(e).toBeInstanceOf(BacktestEngine);
    });

    it('should accept custom config', () => {
      const e = new BacktestEngine({ tushare: {} });
      expect(e).toBeInstanceOf(BacktestEngine);
    });
  });

  describe('runBacktest', () => {
    it('should return backtest result', async () => {
      const config: BacktestConfig = {
        strategy: { pe: { max: 20 } },
        startDate: '20230101',
        endDate: '20231231',
        initialCapital: 1000000,
        holdingPeriod: 5,
        rebalanceFrequency: 'monthly',
        maxPositions: 10,
      };

      const result = await engine.runBacktest(config);

      expect(result).toHaveProperty('config');
      expect(result).toHaveProperty('totalReturn');
      expect(result).toHaveProperty('annualizedReturn');
      expect(result).toHaveProperty('benchmarkReturn');
      expect(result).toHaveProperty('alpha');
      expect(result).toHaveProperty('beta');
      expect(result).toHaveProperty('maxDrawdown');
      expect(result).toHaveProperty('volatility');
      expect(result).toHaveProperty('sharpeRatio');
      expect(result).toHaveProperty('totalTrades');
      expect(result).toHaveProperty('winRate');
      expect(result).toHaveProperty('avgWin');
      expect(result).toHaveProperty('avgLoss');
      expect(result).toHaveProperty('positions');
      expect(result).toHaveProperty('equityCurve');
    });

    it('should use provided initial capital', async () => {
      const config: BacktestConfig = {
        strategy: { pe: { max: 20 } },
        startDate: '20230101',
        endDate: '20231231',
        initialCapital: 5000000,
        holdingPeriod: 5,
        rebalanceFrequency: 'monthly',
        maxPositions: 10,
      };

      const result = await engine.runBacktest(config);

      expect(result.config.initialCapital).toBe(5000000);
    });

    it('should include strategy in result', async () => {
      const config: BacktestConfig = {
        strategy: { pe: { max: 15 }, roe: { min: 10 } },
        startDate: '20230101',
        endDate: '20231231',
        initialCapital: 1000000,
        holdingPeriod: 5,
        rebalanceFrequency: 'monthly',
        maxPositions: 10,
      };

      const result = await engine.runBacktest(config);

      expect(result.config.strategy).toEqual({ pe: { max: 15 }, roe: { min: 10 } });
    });

    it('should return empty positions for short period', async () => {
      const config: BacktestConfig = {
        strategy: { pe: { max: 20 } },
        startDate: '20230101',
        endDate: '20230110',
        initialCapital: 1000000,
        holdingPeriod: 5,
        rebalanceFrequency: 'daily',
        maxPositions: 10,
      };

      const result = await engine.runBacktest(config);

      expect(result.positions).toBeInstanceOf(Array);
      expect(result.equityCurve).toBeInstanceOf(Array);
    });

    it('should handle different rebalance frequencies', async () => {
      const config: BacktestConfig = {
        strategy: { pe: { max: 20 } },
        startDate: '20230101',
        endDate: '20231231',
        initialCapital: 1000000,
        holdingPeriod: 5,
        rebalanceFrequency: 'weekly',
        maxPositions: 10,
      };

      const result = await engine.runBacktest(config);

      expect(result).toHaveProperty('totalTrades');
    });

    it('should return valid metrics', async () => {
      const config: BacktestConfig = {
        strategy: { pe: { max: 20 } },
        startDate: '20230101',
        endDate: '20231231',
        initialCapital: 1000000,
        holdingPeriod: 5,
        rebalanceFrequency: 'monthly',
        maxPositions: 10,
      };

      const result = await engine.runBacktest(config);

      expect(typeof result.totalReturn).toBe('number');
      expect(typeof result.annualizedReturn).toBe('number');
      expect(typeof result.benchmarkReturn).toBe('number');
      expect(typeof result.alpha).toBe('number');
      expect(typeof result.beta).toBe('number');
      expect(typeof result.maxDrawdown).toBe('number');
      expect(typeof result.volatility).toBe('number');
      expect(typeof result.sharpeRatio).toBe('number');
    });

    it('should return valid trade statistics', async () => {
      const config: BacktestConfig = {
        strategy: { pe: { max: 20 } },
        startDate: '20230101',
        endDate: '20231231',
        initialCapital: 1000000,
        holdingPeriod: 5,
        rebalanceFrequency: 'monthly',
        maxPositions: 10,
      };

      const result = await engine.runBacktest(config);

      expect(typeof result.totalTrades).toBe('number');
      expect(typeof result.winRate).toBe('number');
      expect(typeof result.avgWin).toBe('number');
      expect(typeof result.avgLoss).toBe('number');
      expect(result.winRate).toBeGreaterThanOrEqual(0);
      expect(result.winRate).toBeLessThanOrEqual(100);
    });

    it('should return equity curve with dates', async () => {
      const config: BacktestConfig = {
        strategy: { pe: { max: 20 } },
        startDate: '20230101',
        endDate: '20230131',
        initialCapital: 1000000,
        holdingPeriod: 5,
        rebalanceFrequency: 'weekly',
        maxPositions: 10,
      };

      const result = await engine.runBacktest(config);

      result.equityCurve.forEach(point => {
        expect(point).toHaveProperty('date');
        expect(point).toHaveProperty('value');
        expect(typeof point.date).toBe('string');
        expect(typeof point.value).toBe('number');
      });
    });

    it('should return positions with required fields', async () => {
      const config: BacktestConfig = {
        strategy: { pe: { max: 20 } },
        startDate: '20230101',
        endDate: '20231231',
        initialCapital: 1000000,
        holdingPeriod: 5,
        rebalanceFrequency: 'monthly',
        maxPositions: 5,
      };

      const result = await engine.runBacktest(config);

      result.positions.forEach(position => {
        expect(position).toHaveProperty('tsCode');
        expect(position).toHaveProperty('name');
        expect(position).toHaveProperty('buyDate');
        expect(position).toHaveProperty('buyPrice');
        expect(position).toHaveProperty('quantity');
        expect(position).toHaveProperty('return');
      });
    });
  });

  describe('compareStrategies', () => {
    it('should compare multiple strategies', async () => {
      const configs: BacktestConfig[] = [
        {
          strategy: { pe: { max: 15 } },
          startDate: '20230101',
          endDate: '20231231',
          initialCapital: 1000000,
          holdingPeriod: 5,
          rebalanceFrequency: 'monthly',
          maxPositions: 10,
        },
        {
          strategy: { pe: { max: 25 } },
          startDate: '20230101',
          endDate: '20231231',
          initialCapital: 1000000,
          holdingPeriod: 5,
          rebalanceFrequency: 'monthly',
          maxPositions: 10,
        },
      ];

      const results = await engine.compareStrategies(configs);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('totalReturn');
      expect(results[1]).toHaveProperty('totalReturn');
    });

    it('should return results for each strategy', async () => {
      const configs: BacktestConfig[] = [
        {
          strategy: { pe: { max: 20 } },
          startDate: '20230101',
          endDate: '20230131',
          initialCapital: 1000000,
          holdingPeriod: 5,
          rebalanceFrequency: 'weekly',
          maxPositions: 5,
        },
      ];

      const results = await engine.compareStrategies(configs);

      expect(results).toHaveLength(1);
      expect(results[0].config.strategy).toEqual({ pe: { max: 20 } });
    });
  });

  describe('getBacktestEngine', () => {
    it('should return singleton instance', () => {
      const e1 = getBacktestEngine();
      const e2 = getBacktestEngine();

      expect(e1).toBe(e2);
    });

    it('should accept custom config', () => {
      const customEngine = getBacktestEngine({ tushare: {} });
      expect(customEngine).toBeInstanceOf(BacktestEngine);
    });
  });

  describe('backtest metrics', () => {
    it('should calculate valid return metrics', async () => {
      const config: BacktestConfig = {
        strategy: { pe: { max: 20 } },
        startDate: '20230101',
        endDate: '20231231',
        initialCapital: 1000000,
        holdingPeriod: 5,
        rebalanceFrequency: 'monthly',
        maxPositions: 10,
      };

      const result = await engine.runBacktest(config);

      // Returns can be positive or negative
      expect(typeof result.totalReturn).toBe('number');
      expect(typeof result.annualizedReturn).toBe('number');
    });

    it('should calculate valid risk metrics', async () => {
      const config: BacktestConfig = {
        strategy: { pe: { max: 20 } },
        startDate: '20230101',
        endDate: '20231231',
        initialCapital: 1000000,
        holdingPeriod: 5,
        rebalanceFrequency: 'monthly',
        maxPositions: 10,
      };

      const result = await engine.runBacktest(config);

      // Max drawdown should be non-negative
      expect(result.maxDrawdown).toBeGreaterThanOrEqual(0);
      // Volatility should be non-negative
      expect(result.volatility).toBeGreaterThanOrEqual(0);
    });

    it('should calculate valid alpha and beta', async () => {
      const config: BacktestConfig = {
        strategy: { pe: { max: 20 } },
        startDate: '20230101',
        endDate: '20231231',
        initialCapital: 1000000,
        holdingPeriod: 5,
        rebalanceFrequency: 'monthly',
        maxPositions: 10,
      };

      const result = await engine.runBacktest(config);

      // Beta typically between 0 and 2
      expect(result.beta).toBeGreaterThanOrEqual(0);
      expect(result.beta).toBeLessThanOrEqual(2);
    });
  });
});
