/**
 * 多数据源聚合系统 - 数据流管道
 *
 * 实现完整的数据流管道：
 * 1. L1 缓存检查（内存缓存，60秒 TTL）
 * 2. 数据源选择
 * 3. 并行请求（5秒超时）
 * 4. 数据验证
 * 5. 数据融合
 * 6. 写入缓存
 * @module data-sources/pipeline
 */

import { dataAggregator } from './aggregator';
import { CacheManager } from './cache';
import type {
  QuoteData,
  ProfileData,
  SearchResult,
  FinancialData,
} from './types';

/**
 * 管道统计信息
 */
interface PipelineStats {
  /** 缓存命中次数 */
  cacheHits: number;
  /** 缓存未命中次数 */
  cacheMisses: number;
  /** 总请求数 */
  totalRequests: number;
  /** 超时次数 */
  timeouts: number;
}

/**
 * 管道选项
 */
interface PipelineOptions {
  /** 缓存 TTL（秒），默认 60 */
  cacheTTL?: number;
  /** 请求超时（毫秒），默认 5000 */
  timeout?: number;
  /** 是否禁用缓存 */
  disableCache?: boolean;
  /** 是否启用统计 */
  enableStats?: boolean;
}

/**
 * 数据流管道
 *
 * 核心功能：
 * 1. 缓存管理（L1 内存缓存）
 * 2. 超时控制
 * 3. 数据聚合
 * 4. 性能统计
 */
export class DataPipeline {
  private cache: CacheManager;
  private stats: PipelineStats;
  private options: Required<PipelineOptions>;

  /**
   * 默认配置
   */
  private static readonly DEFAULT_OPTIONS: Required<PipelineOptions> = {
    cacheTTL: 60,
    timeout: 5000,
    disableCache: false,
    enableStats: false,
  };

  constructor(options?: PipelineOptions) {
    this.options = { ...DataPipeline.DEFAULT_OPTIONS, ...options };
    this.cache = new CacheManager(!this.options.disableCache);
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      timeouts: 0,
    };
  }

  /**
   * 获取股票报价
   *
   * 数据流：
   * 1. 检查缓存
   * 2. 并行请求多个数据源（带超时）
   * 3. 数据验证与融合
   * 4. 写入缓存
   *
   * @param symbol 股票代码（如 AAPL, 600519.SS）
   * @param options 管道选项
   * @returns 股票报价数据
   */
  async getQuote(
    symbol: string,
    options?: PipelineOptions
  ): Promise<QuoteData> {
    const opts = { ...this.options, ...options };
    const cacheKey = CacheManager.keys.quote(symbol);

    // 阶段 1: 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.recordCacheHit();
      this.log('cache-hit', { symbol, cacheKey });
      return cached;
    }

    this.recordCacheMiss();
    this.log('cache-miss', { symbol, cacheKey });

    // 阶段 2-5: 使用聚合器获取数据（带超时）
    const result = await this.withTimeout(
      dataAggregator.getQuote(symbol),
      opts.timeout,
      `getQuote(${symbol})`
    );

    // 阶段 6: 写入缓存
    this.cache.set(cacheKey, result, opts.cacheTTL);
    this.log('data-fetched', {
      symbol,
      source: result._source,
      sourceCount: result._sourceCount,
      price: result.c,
      change: result.dp,
    });

    return result;
  }

  /**
   * 获取公司资料
   *
   * @param symbol 股票代码
   * @param options 管道选项
   * @returns 公司资料数据
   */
  async getProfile(
    symbol: string,
    options?: PipelineOptions
  ): Promise<ProfileData> {
    const opts = { ...this.options, ...options };
    const cacheKey = CacheManager.keys.profile(symbol);

    // 阶段 1: 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.recordCacheHit();
      this.log('cache-hit', { symbol, cacheKey });
      return cached;
    }

    this.recordCacheMiss();
    this.log('cache-miss', { symbol, cacheKey });

    // 阶段 2-5: 获取数据（带超时）
    const result = await this.withTimeout(
      dataAggregator.getProfile(symbol),
      opts.timeout,
      `getProfile(${symbol})`
    );

    // 阶段 6: 写入缓存
    this.cache.set(cacheKey, result, opts.cacheTTL);
    this.log('data-fetched', {
      symbol,
      source: result._source,
      sourceCount: result._sourceCount,
    });

    return result;
  }

  /**
   * 搜索股票
   *
   * @param query 搜索关键词
   * @param options 管道选项
   * @returns 搜索结果
   */
  async searchStocks(
    query: string,
    options?: PipelineOptions
  ): Promise<SearchResult[]> {
    const opts = { ...this.options, ...options };

    // 搜索结果通常不缓存（结果变化快）
    const result = await this.withTimeout(
      dataAggregator.searchStocks(query),
      opts.timeout,
      `searchStocks(${query})`
    );

    this.log('search-complete', {
      query,
      resultCount: Array.isArray(result) ? result.length : 0,
    });

    // 返回数组或空数组
    return Array.isArray(result) ? result : [];
  }

  /**
   * 获取财务数据
   *
   * @param symbol 股票代码
   * @param options 管道选项
   * @returns 财务数据
   */
  async getFinancials(
    symbol: string,
    options?: PipelineOptions
  ): Promise<FinancialData> {
    const opts = { ...this.options, ...options };
    const cacheKey = CacheManager.keys.financials(symbol);

    // 阶段 1: 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.recordCacheHit();
      this.log('cache-hit', { symbol, cacheKey });
      return cached;
    }

    this.recordCacheMiss();
    this.log('cache-miss', { symbol, cacheKey });

    // 阶段 2-5: 获取数据（带超时）
    const result = await this.withTimeout(
      dataAggregator.getFinancials(symbol),
      opts.timeout,
      `getFinancials(${symbol})`
    );

    // 阶段 6: 写入缓存
    this.cache.set(cacheKey, result, opts.cacheTTL);
    this.log('data-fetched', {
      symbol,
      source: result._source,
      period: result.period,
    });

    return result;
  }

  /**
   * 批量获取股票报价
   *
   * @param symbols 股票代码数组
   * @param options 管道选项
   * @returns 股票报价数据数组
   */
  async getBatchQuotes(
    symbols: string[],
    options?: PipelineOptions
  ): Promise<QuoteData[]> {
    const opts = { ...this.options, ...options };

    // 并行获取所有报价
    const results = await Promise.all(
      symbols.map((symbol) =>
        this.getQuote(symbol, opts).catch((error) => {
          this.log('batch-error', { symbol, error: error.message });
          return null;
        })
      )
    );

    // 过滤掉失败的结果
    return results.filter((r): r is QuoteData => r !== null);
  }

  /**
   * 使缓存失效
   *
   * @param pattern 缓存键模式（正则表达式字符串）
   */
  invalidateCache(pattern: string): void {
    this.cache.invalidate(pattern);
    this.log('cache-invalidated', { pattern });
  }

  /**
   * 清空所有缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.log('cache-cleared', {});
  }

  /**
   * 获取管道统计信息
   *
   * @returns 统计数据
   */
  getStats(): PipelineStats {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      timeouts: 0,
    };
  }

  /**
   * 获取缓存命中率
   *
   * @returns 命中率（0-1）
   */
  getCacheHitRate(): number {
    const total = this.stats.cacheHits + this.stats.cacheMisses;
    return total > 0 ? this.stats.cacheHits / total : 0;
  }

  /**
   * 超时包装器
   *
   * @param promise 要执行的 Promise
   * @param timeoutMs 超时时间（毫秒）
   * @param operation 操作名称（用于日志）
   * @returns Promise 结果
   * @throws Error 超时或操作失败
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string
  ): Promise<T> {
    if (this.options.enableStats) {
      this.stats.totalRequests++;
    }

    // 创建超时 Promise
    const timeoutPromise = new Promise<T>((_, reject) => {
      const timer = setTimeout(() => {
        if (this.options.enableStats) {
          this.stats.timeouts++;
        }
        reject(new Error(`Operation timeout: ${operation} exceeded ${timeoutMs}ms`));
      }, timeoutMs);

      // 清理定时器
      promise.finally(() => clearTimeout(timer));
    });

    // 使用 Promise.race 实现超时控制
    try {
      return await Promise.race([promise, timeoutPromise]);
    } catch (error) {
      this.log('operation-error', {
        operation,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 记录缓存命中
   */
  private recordCacheHit(): void {
    if (this.options.enableStats) {
      this.stats.cacheHits++;
      this.stats.totalRequests++;
    }
  }

  /**
   * 记录缓存未命中
   */
  private recordCacheMiss(): void {
    if (this.options.enableStats) {
      this.stats.cacheMisses++;
      this.stats.totalRequests++;
    }
  }

  /**
   * 日志记录
   *
   * @param level 日志级别
   * @param data 日志数据
   */
  private log(level: string, data: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
      const timestamp = new Date().toISOString();
      // eslint-disable-next-line no-console
      console.log(`[DataPipeline ${timestamp}] ${level}:`, data);
    }
  }
}

/**
 * 导出单例实例
 * 整个应用应使用此实例访问数据管道
 */
export const dataPipeline = new DataPipeline({
  cacheTTL: 60, // 60秒缓存
  timeout: 5000, // 5秒超时
  disableCache: process.env.NODE_ENV === 'test', // 测试环境禁用缓存
  enableStats: process.env.NODE_ENV === 'development', // 开发环境启用统计
});
