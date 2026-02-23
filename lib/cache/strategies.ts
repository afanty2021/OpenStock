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
