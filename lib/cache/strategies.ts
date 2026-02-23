/**
 * 缓存策略配置
 *
 * 定义不同数据类型的缓存 TTL 和 staleWhileRevalidate 策略
 * 用于优化 API 请求性能和用户体验
 *
 * @module lib/cache/strategies
 */

/**
 * 缓存策略配置接口
 */
export interface CacheStrategy {
  /** 缓存过期时间（秒） */
  ttl: number;
  /** 过期后后台重新验证时间（秒） */
  staleWhileRevalidate: number;
  /** 是否启用缓存 */
  enabled?: boolean;
}

/**
 * 缓存策略集合
 *
 * 根据数据类型和更新频率定义不同的缓存策略
 */
export const CACHE_STRATEGIES = {
  /** 股票实时报价 - 60秒缓存 */
  quote: {
    ttl: 60,
    staleWhileRevalidate: 30,
    enabled: true,
  } satisfies CacheStrategy,

  /** K线数据 - 5分钟缓存 */
  kline: {
    ttl: 300,
    staleWhileRevalidate: 60,
    enabled: true,
  } satisfies CacheStrategy,

  /** 公司基本信息 - 1小时缓存 */
  profile: {
    ttl: 3600,
    staleWhileRevalidate: 300,
    enabled: true,
  } satisfies CacheStrategy,

  /** 财报数据 - 24小时缓存 */
  financial: {
    ttl: 86400,
    staleWhileRevalidate: 3600,
    enabled: true,
  } satisfies CacheStrategy,

  /** 龙虎榜数据 - 当日有效（到收盘） */
  toplist: {
    ttl: 0,
    staleWhileRevalidate: 0,
    enabled: true,
  } satisfies CacheStrategy,

  /** 资金流向数据 - 5分钟缓存 */
  moneyFlow: {
    ttl: 300,
    staleWhileRevalidate: 60,
    enabled: true,
  } satisfies CacheStrategy,

  /** 融资融券数据 - 1小时缓存 */
  margin: {
    ttl: 3600,
    staleWhileRevalidate: 300,
    enabled: true,
  } satisfies CacheStrategy,

  /** 板块数据 - 5分钟缓存 */
  sector: {
    ttl: 300,
    staleWhileRevalidate: 60,
    enabled: true,
  } satisfies CacheStrategy,

  /** 新闻数据 - 10分钟缓存 */
  news: {
    ttl: 600,
    staleWhileRevalidate: 120,
    enabled: true,
  } satisfies CacheStrategy,

  /** 搜索结果 - 30分钟缓存 */
  search: {
    ttl: 1800,
    staleWhileRevalidate: 300,
    enabled: true,
  } satisfies CacheStrategy,

  /** 用户观察列表 - 无过期（用户主动刷新） */
  watchlist: {
    ttl: 0,
    staleWhileRevalidate: 0,
    enabled: false,
  } satisfies CacheStrategy,
} as const;

/**
 * 缓存策略类型
 */
export type CacheStrategyType = keyof typeof CACHE_STRATEGIES;

/**
 * 获取指定类型的缓存策略
 *
 * @param type - 缓存策略类型
 * @returns 缓存策略配置
 *
 * @example
 * ```ts
 * const strategy = getCacheStrategy('quote');
 * console.log(strategy.ttl); // 60
 * ```
 */
export function getCacheStrategy(type: CacheStrategyType): CacheStrategy {
  return CACHE_STRATEGIES[type];
}

/**
 * 计算缓存过期时间戳
 *
 * @param type - 缓存策略类型
 * @returns 过期时间戳（毫秒）
 *
 * @example
 * ```ts
 * const expiresAt = getCacheExpiresAt('quote');
 * console.log(expiresAt); // Date.now() + 60000
 * ```
 */
export function getCacheExpiresAt(type: CacheStrategyType): number {
  const strategy = getCacheStrategy(type);
  return Date.now() + strategy.ttl * 1000;
}

/**
 * 检查缓存是否过期
 *
 * @param type - 缓存策略类型
 * @param cachedAt - 缓存时间戳（毫秒）
 * @returns 是否过期
 *
 * @example
 * ```ts
 * const isExpired = isCacheExpired('quote', Date.now() - 70000);
 * console.log(isExpired); // true
 * ```
 */
export function isCacheExpired(type: CacheStrategyType, cachedAt: number): boolean {
  const strategy = getCacheStrategy(type);
  if (strategy.ttl === 0) {
    return false; // 永不过期
  }
  return Date.now() - cachedAt > strategy.ttl * 1000;
}

/**
 * 检查缓存是否处于 stale-while-revalidate 阶段
 *
 * @param type - 缓存策略类型
 * @param cachedAt - 缓存时间戳（毫秒）
 * @returns 是否需要后台重新验证
 *
 * @example
 * ```ts
 * const shouldRevalidate = shouldStaleRevalidate('quote', Date.now() - 40000);
 * console.log(shouldRevalidate); // true
 * ```
 */
export function shouldStaleRevalidate(type: CacheStrategyType, cachedAt: number): boolean {
  const strategy = getCacheStrategy(type);
  if (strategy.staleWhileRevalidate === 0) {
    return false;
  }
  const expiryTime = cachedAt + strategy.ttl * 1000;
  return Date.now() - expiryTime > strategy.staleWhileRevalidate * 1000;
}

/**
 * 获取龙虎榜数据的缓存过期时间
 *
 * 龙虎榜数据在交易日收盘前有效，收盘后到下一交易日前有效
 *
 * @param tradeDate - 交易日期（YYYY-MM-DD）
 * @returns 过期时间戳（毫秒）
 */
export function getTopListCacheExpiresAt(tradeDate: string): number {
  const tradeDateTime = new Date(tradeDate);
  const now = new Date();

  // 如果交易日期是今天，设置到今天收盘（15:00）
  if (
    tradeDateTime.getDate() === now.getDate() &&
    tradeDateTime.getMonth() === now.getMonth() &&
    tradeDateTime.getFullYear() === now.getFullYear()
  ) {
    const marketClose = new Date(now);
    marketClose.setHours(15, 0, 0, 0);
    return marketClose.getTime();
  }

  // 如果是过去的交易日期，设置到下一个交易日开盘（简化为第二天 9:30）
  const nextOpen = new Date(tradeDateTime);
  nextOpen.setDate(nextOpen.getDate() + 1);
  nextOpen.setHours(9, 30, 0, 0);
  return nextOpen.getTime();
}

/**
 * 缓存条目接口
 */
interface CacheEntry<T> {
  /** 缓存的数据 */
  data: T;
  /** 缓存时间戳（毫秒） */
  cachedAt: number;
  /** 缓存策略类型 */
  strategyType: CacheStrategyType;
}

/**
 * 简单的内存缓存管理器
 *
 * 提供基于内存的缓存实现，支持 TTL 和 stale-while-revalidate 策略
 *
 * @example
 * ```ts
 * const cacheManager = new CacheManager<StockData>();
 *
 * // 设置缓存（使用默认 quote 策略）
 * await cacheManager.set('AAPL', stockData, 'quote');
 *
 * // 获取缓存
 * const cached = await cacheManager.get('AAPL', 'quote');
 *
 * // 清除缓存
 * await cacheManager.delete('AAPL');
 *
 * // 清空所有缓存
 * await cacheManager.clear();
 * ```
 */
export class CacheManager<T = unknown> {
  /** 缓存存储 */
  private cache: Map<string, CacheEntry<T>> = new Map();

  /** 缓存键前缀 */
  private prefix: string;

  /**
   * 构造函数
   * @param prefix - 缓存键前缀，用于区分不同类型的缓存
   */
  constructor(prefix: string = 'cache') {
    this.prefix = prefix;
  }

  /**
   * 生成完整的缓存键
   * @param key - 原始键
   * @returns 完整的缓存键
   */
  private getFullKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * 设置缓存
   * @param key - 缓存键
   * @param data - 要缓存的数据
   * @param strategyType - 缓存策略类型
   */
  async set(key: string, data: T, strategyType: CacheStrategyType): Promise<void> {
    const strategy = getCacheStrategy(strategyType);
    if (!strategy.enabled) {
      return; // 缓存未启用，直接返回
    }

    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
      strategyType,
    };

    this.cache.set(this.getFullKey(key), entry);
  }

  /**
   * 获取缓存
   * @param key - 缓存键
   * @param strategyType - 缓存策略类型
   * @returns 缓存的数据，如果不存在或已过期则返回 null
   */
  async get(key: string, strategyType: CacheStrategyType): Promise<T | null> {
    const entry = this.cache.get(this.getFullKey(key));

    if (!entry) {
      return null;
    }

    // 检查缓存是否过期
    if (isCacheExpired(entry.strategyType, entry.cachedAt)) {
      this.cache.delete(this.getFullKey(key));
      return null;
    }

    return entry.data;
  }

  /**
   * 获取缓存并检查是否需要后台重新验证
   * @param key - 缓存键
   * @param strategyType - 缓存策略类型
   * @returns [缓存的数据, 是否需要重新验证]
   */
  async getWithRevalidation(key: string, strategyType: CacheStrategyType): Promise<{
    data: T | null;
    shouldRevalidate: boolean;
  }> {
    const entry = this.cache.get(this.getFullKey(key));

    if (!entry) {
      return { data: null, shouldRevalidate: false };
    }

    // 检查是否过期
    const isExpired = isCacheExpired(entry.strategyType, entry.cachedAt);
    if (isExpired) {
      this.cache.delete(this.getFullKey(key));
      return { data: null, shouldRevalidate: false };
    }

    // 检查是否需要后台重新验证
    const shouldRevalidate = shouldStaleRevalidate(entry.strategyType, entry.cachedAt);

    return {
      data: entry.data,
      shouldRevalidate,
    };
  }

  /**
   * 删除缓存
   * @param key - 缓存键
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(this.getFullKey(key));
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * 清理过期的缓存条目
   * @returns 清理的条目数量
   */
  async cleanExpired(): Promise<number> {
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (isCacheExpired(entry.strategyType, entry.cachedAt)) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计
   */
  getStats(): {
    size: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * 检查缓存是否存在
   * @param key - 缓存键
   * @returns 是否存在
   */
  has(key: string): boolean {
    return this.cache.has(this.getFullKey(key));
  }
}

/**
 * 创建默认的缓存管理器实例
 */
export const defaultCacheManager = new CacheManager();
