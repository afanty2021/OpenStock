/**
 * 多数据源聚合系统 - 缓存管理器
 *
 * 提供内存缓存功能，支持 TTL 过期
 * @module data-sources/cache
 */

/**
 * 缓存管理器
 * 使用 Map 存储缓存数据，支持 TTL 过期
 */
export class CacheManager {
  private memoryCache: Map<string, { data: any; expiry: number }>;
  private enabled: boolean;

  constructor(enabled = true) {
    this.memoryCache = new Map();
    this.enabled = enabled && process.env.NODE_ENV === 'production';
  }

  /**
   * 获取缓存数据
   *
   * @param key 缓存键
   * @param options 选项
   * @returns 缓存的数据或 null
   */
  get(key: string, options?: { allowExpired?: boolean }): any | null {
    if (!this.enabled && !options?.allowExpired) return null;

    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    // 检查是否过期
    if (Date.now() > cached.expiry && !options?.allowExpired) {
      this.memoryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 设置缓存数据
   *
   * @param key 缓存键
   * @param data 数据
   * @param ttlSeconds 过期时间（秒）
   */
  set(key: string, data: any, ttlSeconds: number): void {
    if (!this.enabled) return;

    this.memoryCache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * 使缓存失效
   * 支持模式匹配
   *
   * @param pattern 正则表达式模式
   */
  invalidate(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.memoryCache.clear();
  }

  /**
   * 缓存键生成器
   */
  static keys = {
    quote: (symbol: string) => `quote:${symbol}`,
    profile: (symbol: string) => `profile:${symbol}`,
    news: (symbols: string[]) => `news:${symbols.sort().join(',')}`,
    financials: (symbol: string) => `financials:${symbol}`,
  };
}
