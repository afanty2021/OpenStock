/**
 * 策略管理器单元测试
 * @module data-sources/astock/__tests__/strategy-manager.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  StrategyManager,
  getStrategyManager,
  type SavedStrategy,
  type ScreenerCriteria,
} from '../strategy-manager';

describe('StrategyManager', () => {
  let manager: StrategyManager;

  beforeEach(() => {
    manager = new StrategyManager();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const m = new StrategyManager();
      expect(m).toBeInstanceOf(StrategyManager);
    });

    it('should accept custom config', () => {
      const m = new StrategyManager({ mongoose: {} });
      expect(m).toBeInstanceOf(StrategyManager);
    });
  });

  describe('saveStrategy', () => {
    it('should save strategy with required fields', async () => {
      const strategy = {
        name: 'Test Strategy',
        description: 'A test strategy',
        criteria: { pe: { max: 20 }, roe: { min: 10 } } as ScreenerCriteria,
        isPublic: false,
      };

      const saved = await manager.saveStrategy('user_123', strategy);

      expect(saved).toHaveProperty('id');
      expect(saved.name).toBe('Test Strategy');
      expect(saved.description).toBe('A test strategy');
      expect(saved.userId).toBe('user_123');
      expect(saved.isPublic).toBe(false);
      expect(saved).toHaveProperty('createdAt');
      expect(saved).toHaveProperty('updatedAt');
    });

    it('should default isPublic to false', async () => {
      const strategy = {
        name: 'Test Strategy',
        description: 'A test strategy',
        criteria: { pe: { max: 20 } } as ScreenerCriteria,
      };

      const saved = await manager.saveStrategy('user_123', strategy as any);

      expect(saved.isPublic).toBe(false);
    });

    it('should include backtest summary if provided', async () => {
      const strategy = {
        name: 'Test Strategy',
        description: 'A test strategy',
        criteria: { pe: { max: 20 } } as ScreenerCriteria,
        isPublic: false,
        backtestSummary: { totalReturn: 25, winRate: 60, sharpeRatio: 1.2 },
      };

      const saved = await manager.saveStrategy('user_123', strategy as any);

      expect(saved.backtestSummary).toEqual({ totalReturn: 25, winRate: 60, sharpeRatio: 1.2 });
    });

    it('should generate unique id', async () => {
      const strategy = {
        name: 'Strategy 1',
        description: 'Test',
        criteria: {} as ScreenerCriteria,
      };

      const saved1 = await manager.saveStrategy('user_1', strategy as any);
      const saved2 = await manager.saveStrategy('user_1', { ...strategy, name: 'Strategy 2' } as any);

      expect(saved1.id).not.toBe(saved2.id);
    });
  });

  describe('getUserStrategies', () => {
    it('should return user strategies', async () => {
      const strategies = await manager.getUserStrategies('current_user');

      expect(strategies).toBeInstanceOf(Array);
      expect(strategies.length).toBeGreaterThan(0);
    });

    it('should include strategy details', async () => {
      const strategies = await manager.getUserStrategies('current_user');

      strategies.forEach(s => {
        expect(s).toHaveProperty('id');
        expect(s).toHaveProperty('name');
        expect(s).toHaveProperty('description');
        expect(s).toHaveProperty('criteria');
        expect(s).toHaveProperty('isPublic');
      });
    });

    it('should filter by user id', async () => {
      const strategies = await manager.getUserStrategies('some_user');

      strategies.forEach(s => {
        expect(s.userId).toBe('some_user');
      });
    });
  });

  describe('getStrategy', () => {
    it('should return strategy by id', async () => {
      const strategy = await manager.getStrategy('strat_001');

      expect(strategy).not.toBeNull();
      expect(strategy?.id).toBe('strat_001');
    });

    it('should return null for non-existent strategy', async () => {
      const strategy = await manager.getStrategy('non_existent');

      expect(strategy).toBeNull();
    });
  });

  describe('updateStrategy', () => {
    it('should update strategy fields', async () => {
      const updated = await manager.updateStrategy('strat_001', {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.id).toBe('strat_001');
    });

    it('should preserve other fields', async () => {
      const updated = await manager.updateStrategy('strat_001', {
        description: 'New description',
      });

      expect(updated.description).toBe('New description');
      expect(updated.criteria).toBeDefined();
    });

    it('should throw error for non-existent strategy', async () => {
      await expect(
        manager.updateStrategy('non_existent', { name: 'Test' })
      ).rejects.toThrow('not found');
    });

    it('should update backtest summary', async () => {
      const updated = await manager.updateStrategy('strat_001', {
        backtestSummary: { totalReturn: 30, winRate: 70, sharpeRatio: 1.5 },
      });

      expect(updated.backtestSummary).toEqual({ totalReturn: 30, winRate: 70, sharpeRatio: 1.5 });
    });
  });

  describe('deleteStrategy', () => {
    it('should delete strategy without error', async () => {
      await expect(manager.deleteStrategy('strat_001')).resolves.not.toThrow();
    });
  });

  describe('cloneStrategy', () => {
    it('should clone public strategy', async () => {
      const cloned = await manager.cloneStrategy('strat_pub_001', 'new_user');

      expect(cloned.name).toContain('克隆');
      expect(cloned.userId).toBe('new_user');
      expect(cloned.isPublic).toBe(false);
    });

    it('should preserve criteria from source', async () => {
      const cloned = await manager.cloneStrategy('strat_pub_001', 'new_user');

      expect(cloned.criteria).toBeDefined();
    });

    it('should throw error for non-existent strategy', async () => {
      await expect(
        manager.cloneStrategy('non_existent', 'user_123')
      ).rejects.toThrow('not found');
    });
  });

  describe('getPublicStrategies', () => {
    it('should return public strategies', async () => {
      const strategies = await manager.getPublicStrategies();

      expect(strategies).toBeInstanceOf(Array);
      expect(strategies.length).toBeGreaterThan(0);
    });

    it('should only return public strategies', async () => {
      const strategies = await manager.getPublicStrategies();

      strategies.forEach(s => {
        expect(s.isPublic).toBe(true);
      });
    });

    it('should include system strategies', async () => {
      const strategies = await manager.getPublicStrategies();

      expect(strategies.some(s => s.userId === 'system')).toBe(true);
    });
  });

  describe('updateBacktestSummary', () => {
    it('should update backtest summary', async () => {
      const updated = await manager.updateBacktestSummary('strat_001', {
        totalReturn: 35,
        winRate: 75,
        sharpeRatio: 1.8,
      });

      expect(updated.backtestSummary).toEqual({
        totalReturn: 35,
        winRate: 75,
        sharpeRatio: 1.8,
      });
    });
  });

  describe('getStrategyManager', () => {
    it('should return singleton instance', () => {
      const m1 = getStrategyManager();
      const m2 = getStrategyManager();

      expect(m1).toBe(m2);
    });

    it('should accept custom config', () => {
      const customManager = getStrategyManager({ mongoose: {} });
      expect(customManager).toBeInstanceOf(StrategyManager);
    });
  });

  describe('strategy data integrity', () => {
    it('should preserve createdAt on update', async () => {
      const strategy = await manager.getStrategy('strat_001');
      const createdAt = strategy?.createdAt;

      const updated = await manager.updateStrategy('strat_001', { name: 'Updated' });

      expect(updated.createdAt).toBe(createdAt);
    });

    it('should update updatedAt on save', async () => {
      const saved = await manager.saveStrategy('user_new', {
        name: 'New Strategy',
        description: 'Test',
        criteria: {} as ScreenerCriteria,
      });

      // Just verify it has a valid timestamp format
      expect(saved.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(saved.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should have valid id format', async () => {
      const saved = await manager.saveStrategy('user_test', {
        name: 'Test',
        description: 'Test',
        criteria: {} as ScreenerCriteria,
      });

      expect(saved.id).toMatch(/^strat_/);
    });
  });
});
