/**
 * 选股筛选器单元测试
 * @module data-sources/astock/__tests__/stock-screener.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  StockScreener,
  getStockScreener,
  PRESET_STRATEGIES,
  SCREENER_CRITERIA_TEMPLATES,
  type ScreenerCriteria,
  type ScreenerResult,
} from '../stock-screener';

describe('StockScreener', () => {
  let screener: StockScreener;

  beforeEach(() => {
    screener = new StockScreener({ defaultLimit: 10 });
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const s = new StockScreener();
      expect(s).toBeInstanceOf(StockScreener);
    });

    it('should accept custom default limit', () => {
      const s = new StockScreener({ defaultLimit: 100 });
      expect(s).toBeInstanceOf(StockScreener);
    });
  });

  describe('screen', () => {
    it('should return results with valid criteria', async () => {
      const criteria: ScreenerCriteria = {
        pe: { max: 20 },
        roe: { min: 10 },
      };

      const results = await screener.screen(criteria);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      const criteria: ScreenerCriteria = {
        pe: { max: 50 },
      };

      const results = await screener.screen(criteria, 5);

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should use default limit when not specified', async () => {
      const criteria: ScreenerCriteria = {
        pe: { max: 50 },
      };

      const screenerWithLimit = new StockScreener({ defaultLimit: 3 });
      const results = await screenerWithLimit.screen(criteria);

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should filter by PE correctly', async () => {
      const criteria: ScreenerCriteria = {
        pe: { max: 10 },
      };

      const results = await screener.screen(criteria);

      results.forEach(r => {
        expect(r.pe).toBeLessThanOrEqual(10);
      });
    });

    it('should filter by ROE correctly', async () => {
      const criteria: ScreenerCriteria = {
        roe: { min: 20 },
      };

      const results = await screener.screen(criteria);

      results.forEach(r => {
        expect(r.roe).toBeGreaterThanOrEqual(20);
      });
    });

    it('should filter by market cap correctly', async () => {
      const criteria: ScreenerCriteria = {
        marketCap: { min: 5000 },
      };

      const results = await screener.screen(criteria);

      results.forEach(r => {
        expect(r.marketCap).toBeGreaterThanOrEqual(5000);
      });
    });

    it('should filter by net margin with valid criteria', async () => {
      const criteria: ScreenerCriteria = {
        netMargin: { min: 20 },
      };

      const results = await screener.screen(criteria);
      expect(results).toBeInstanceOf(Array);
    });

    it('should filter by revenue growth with valid criteria', async () => {
      const criteria: ScreenerCriteria = {
        revenueGrowth: { min: 30 },
      };

      const results = await screener.screen(criteria);
      expect(results).toBeInstanceOf(Array);
    });

    it('should combine multiple criteria', async () => {
      const criteria: ScreenerCriteria = {
        pe: { max: 15 },
        roe: { min: 15 },
        marketCap: { min: 5000 },
      };

      const results = await screener.screen(criteria);

      results.forEach(r => {
        expect(r.pe).toBeLessThanOrEqual(15);
        expect(r.roe).toBeGreaterThanOrEqual(15);
        expect(r.marketCap).toBeGreaterThanOrEqual(5000);
      });
    });

    it('should return results with score', async () => {
      const criteria: ScreenerCriteria = {
        pe: { max: 30 },
        roe: { min: 10 },
      };

      const results = await screener.screen(criteria);

      expect(results[0]).toHaveProperty('score');
      expect(typeof results[0].score).toBe('number');
    });

    it('should sort results by score descending', async () => {
      const criteria: ScreenerCriteria = {
        pe: { max: 50 },
        roe: { min: 5 },
      };

      const results = await screener.screen(criteria);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });
  });

  describe('screenWithStrategy', () => {
    it('should screen with preset strategy', async () => {
      const results = await screener.screenWithStrategy('value-investing');

      expect(results).toBeInstanceOf(Array);
    });

    it('should throw error for invalid strategy', async () => {
      await expect(screener.screenWithStrategy('invalid-strategy')).rejects.toThrow('Strategy not found');
    });

    it('should respect limit for strategy', async () => {
      const results = await screener.screenWithStrategy('growth-stocks', 3);

      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getAvailableCriteria', () => {
    it('should return criteria templates', () => {
      const templates = screener.getAvailableCriteria();

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should include market criteria', () => {
      const templates = screener.getAvailableCriteria();

      const marketCriteria = templates.filter(t => t.group === 'market');
      expect(marketCriteria.length).toBeGreaterThan(0);
    });

    it('should include valuation criteria', () => {
      const templates = screener.getAvailableCriteria();

      const valuationCriteria = templates.filter(t => t.group === 'valuation');
      expect(valuationCriteria.length).toBeGreaterThan(0);
    });

    it('should include profitability criteria', () => {
      const templates = screener.getAvailableCriteria();

      const profitabilityCriteria = templates.filter(t => t.group === 'profitability');
      expect(profitabilityCriteria.length).toBeGreaterThan(0);
    });

    it('should include growth criteria', () => {
      const templates = screener.getAvailableCriteria();

      const growthCriteria = templates.filter(t => t.group === 'growth');
      expect(growthCriteria.length).toBeGreaterThan(0);
    });
  });

  describe('getPresetStrategies', () => {
    it('should return preset strategies', () => {
      const strategies = screener.getPresetStrategies();

      expect(strategies).toBeInstanceOf(Array);
      expect(strategies.length).toBeGreaterThan(0);
    });

    it('should include value investing strategy', () => {
      const strategies = screener.getPresetStrategies();

      expect(strategies.some(s => s.id === 'value-investing')).toBe(true);
    });

    it('should include growth stocks strategy', () => {
      const strategies = screener.getPresetStrategies();

      expect(strategies.some(s => s.id === 'growth-stocks')).toBe(true);
    });

    it('should include all required strategy fields', () => {
      const strategies = screener.getPresetStrategies();

      strategies.forEach(s => {
        expect(s).toHaveProperty('id');
        expect(s).toHaveProperty('name');
        expect(s).toHaveProperty('description');
        expect(s).toHaveProperty('criteria');
        expect(s).toHaveProperty('riskLevel');
      });
    });
  });

  describe('getCriteriaByGroup', () => {
    it('should return criteria for market group', () => {
      const criteria = screener.getCriteriaByGroup('market');

      criteria.forEach(c => {
        expect(c.group).toBe('market');
      });
    });

    it('should return criteria for valuation group', () => {
      const criteria = screener.getCriteriaByGroup('valuation');

      criteria.forEach(c => {
        expect(c.group).toBe('valuation');
      });
    });

    it('should return criteria for profitability group', () => {
      const criteria = screener.getCriteriaByGroup('profitability');

      criteria.forEach(c => {
        expect(c.group).toBe('profitability');
      });
    });
  });

  describe('validation', () => {
    it('should handle various criteria gracefully', async () => {
      const criteria: ScreenerCriteria = {
        pe: { min: 10, max: 30 },
        roe: { min: 5 },
        marketCap: { min: 1000 },
      };

      const results = await screener.screen(criteria);
      expect(results).toBeInstanceOf(Array);
    });
  });

  describe('PRESET_STRATEGIES', () => {
    it('should have value investing strategy', () => {
      const strategy = PRESET_STRATEGIES.find(s => s.id === 'value-investing');

      expect(strategy).toBeDefined();
      expect(strategy?.criteria.pe?.max).toBe(15);
      expect(strategy?.criteria.roe?.min).toBe(10);
    });

    it('should have growth stocks strategy', () => {
      const strategy = PRESET_STRATEGIES.find(s => s.id === 'growth-stocks');

      expect(strategy).toBeDefined();
      expect(strategy?.criteria.revenueGrowth?.min).toBe(20);
      expect(strategy?.criteria.profitGrowth?.min).toBe(15);
    });

    it('should have dividend strategy', () => {
      const strategy = PRESET_STRATEGIES.find(s => s.id === 'dividend');

      expect(strategy).toBeDefined();
      expect(strategy?.criteria.roe?.min).toBe(8);
      expect(strategy?.criteria.netMargin?.min).toBe(10);
    });
  });

  describe('SCREENER_CRITERIA_TEMPLATES', () => {
    it('should have market field', () => {
      const marketField = SCREENER_CRITERIA_TEMPLATES.find(t => t.field === 'market');

      expect(marketField).toBeDefined();
      expect(marketField?.type).toBe('select');
    });

    it('should have pe field', () => {
      const peField = SCREENER_CRITERIA_TEMPLATES.find(t => t.field === 'pe');

      expect(peField).toBeDefined();
      expect(peField?.type).toBe('range');
    });

    it('should have roe field', () => {
      const roeField = SCREENER_CRITERIA_TEMPLATES.find(t => t.field === 'roe');

      expect(roeField).toBeDefined();
      expect(roeField?.type).toBe('range');
    });
  });

  describe('getStockScreener', () => {
    it('should return singleton instance', () => {
      const s1 = getStockScreener();
      const s2 = getStockScreener();

      expect(s1).toBe(s2);
    });

    it('should accept custom config', () => {
      const customScreener = getStockScreener({ defaultLimit: 20 });
      expect(customScreener).toBeInstanceOf(StockScreener);
    });
  });
});
