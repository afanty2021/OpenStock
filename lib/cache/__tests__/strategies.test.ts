/**
 * 缓存策略测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CACHE_STRATEGIES,
  getCacheStrategy,
  getCacheExpiresAt,
  isCacheExpired,
  shouldStaleRevalidate,
  getTopListCacheExpiresAt,
  type CacheStrategyType,
} from '../strategies';

describe('缓存策略', () => {
  describe('CACHE_STRATEGIES', () => {
    it('应该包含所有定义的缓存策略', () => {
      expect(CACHE_STRATEGIES).toHaveProperty('quote');
      expect(CACHE_STRATEGIES).toHaveProperty('kline');
      expect(CACHE_STRATEGIES).toHaveProperty('profile');
      expect(CACHE_STRATEGIES).toHaveProperty('financial');
      expect(CACHE_STRATEGIES).toHaveProperty('toplist');
      expect(CACHE_STRATEGIES).toHaveProperty('moneyFlow');
      expect(CACHE_STRATEGIES).toHaveProperty('margin');
      expect(CACHE_STRATEGIES).toHaveProperty('sector');
      expect(CACHE_STRATEGIES).toHaveProperty('news');
      expect(CACHE_STRATEGIES).toHaveProperty('search');
      expect(CACHE_STRATEGIES).toHaveProperty('watchlist');
    });

    it('股票报价应该有 60 秒 TTL', () => {
      expect(CACHE_STRATEGIES.quote.ttl).toBe(60);
      expect(CACHE_STRATEGIES.quote.staleWhileRevalidate).toBe(30);
    });

    it('K线数据应该有 5 分钟 TTL', () => {
      expect(CACHE_STRATEGIES.kline.ttl).toBe(300);
      expect(CACHE_STRATEGIES.kline.staleWhileRevalidate).toBe(60);
    });

    it('公司信息应该有 1 小时 TTL', () => {
      expect(CACHE_STRATEGIES.profile.ttl).toBe(3600);
      expect(CACHE_STRATEGIES.profile.staleWhileRevalidate).toBe(300);
    });

    it('财报数据应该有 24 小时 TTL', () => {
      expect(CACHE_STRATEGIES.financial.ttl).toBe(86400);
      expect(CACHE_STRATEGIES.financial.staleWhileRevalidate).toBe(3600);
    });

    it('龙虎榜应该没有 TTL（当日有效）', () => {
      expect(CACHE_STRATEGIES.toplist.ttl).toBe(0);
      expect(CACHE_STRATEGIES.toplist.staleWhileRevalidate).toBe(0);
    });

    it('观察列表应该禁用缓存', () => {
      expect(CACHE_STRATEGIES.watchlist.enabled).toBe(false);
    });
  });

  describe('getCacheStrategy', () => {
    it('应该返回正确的缓存策略', () => {
      const strategy = getCacheStrategy('quote');
      expect(strategy.ttl).toBe(CACHE_STRATEGIES.quote.ttl);
      expect(strategy.staleWhileRevalidate).toBe(CACHE_STRATEGIES.quote.staleWhileRevalidate);
    });
  });

  describe('getCacheExpiresAt', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(1000000);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('应该计算正确的过期时间', () => {
      const expiresAt = getCacheExpiresAt('quote');
      expect(expiresAt).toBeGreaterThanOrEqual(1000000 + 60000 - 10); // 允许小误差
      expect(expiresAt).toBeLessThanOrEqual(1000000 + 60000 + 10);
    });

    it('K线数据应该有 5 分钟的过期时间', () => {
      const expiresAt = getCacheExpiresAt('kline');
      expect(expiresAt).toBeGreaterThanOrEqual(1000000 + 300000 - 10); // 允许小误差
      expect(expiresAt).toBeLessThanOrEqual(1000000 + 300000 + 10);
    });
  });

  describe('isCacheExpired', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(1000000);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('应该检测过期的缓存', () => {
      const cachedAt = 1000000 - 70000; // 70秒前缓存
      expect(isCacheExpired('quote', cachedAt)).toBe(true);
    });

    it('应该检测未过期的缓存', () => {
      const cachedAt = 1000000 - 30000; // 30秒前缓存
      expect(isCacheExpired('quote', cachedAt)).toBe(false);
    });

    it('TTL 为 0 的缓存应该永不过期', () => {
      const cachedAt = 1000000 - 1000000; // 很久以前缓存
      expect(isCacheExpired('toplist', cachedAt)).toBe(false);
    });
  });

  describe('shouldStaleRevalidate', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(1000000);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('应该检测需要后台重新验证的缓存', () => {
      const cachedAt = 1000000 - 95000; // 95秒前缓存（60秒过期 + 30秒 stale）
      expect(shouldStaleRevalidate('quote', cachedAt)).toBe(true);
    });

    it('应该检测不需要后台重新验证的缓存', () => {
      const cachedAt = 1000000 - 50000; // 50秒前缓存（未过期）
      expect(shouldStaleRevalidate('quote', cachedAt)).toBe(false);
    });

    it('staleWhileRevalidate 为 0 时应该不触发重新验证', () => {
      const cachedAt = 1000000 - 1000000;
      expect(shouldStaleRevalidate('toplist', cachedAt)).toBe(false);
    });
  });

  describe('getTopListCacheExpiresAt', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // 设置本地时间（不使用 Z 后缀以使用本地时区）
      vi.setSystemTime(new Date('2026-02-23T10:00:00').getTime());
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('今天的交易日期应该设置到 15:00', () => {
      const expiresAt = getTopListCacheExpiresAt('2026-02-23');
      // 验证返回的是今天 15:00 的时间戳
      const expectedTime = new Date('2026-02-23T15:00:00').getTime();
      expect(expiresAt).toBe(expectedTime);
    });

    it('过去的交易日期应该设置到第二天 9:30', () => {
      const expiresAt = getTopListCacheExpiresAt('2026-02-22');
      // 验证返回的是第二天 9:30 的时间戳
      const expectedTime = new Date('2026-02-23T09:30:00').getTime();
      expect(expiresAt).toBe(expectedTime);
    });
  });
});
