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
import { telemetryCollector } from './monitoring';
import { createLogger } from './logger';
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
  private logger = createLogger('DataPipeline');

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

    // 记录初始化
    this.logger.info('DataPipeline 初始化完成', {
      cacheTTL: this.options.cacheTTL,
      timeout: this.options.timeout,
      disableCache: this.options.disableCache,
      enableStats: this.options.enableStats,
    });
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
    return await this.logger.logPerformance('getQuote', async () => {
      const opts = { ...this.options, ...options };
      const cacheKey = CacheManager.keys.quote(symbol);

      // 阶段 1: 检查缓存
      this.logger.debug('检查缓存', { symbol, cacheKey });
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.recordCacheHit();
        telemetryCollector.recordCacheHit();
        this.logger.debug('缓存命中', { symbol, cacheKey });
        return cached;
      }

      this.recordCacheMiss();
      telemetryCollector.recordCacheMiss();
      this.logger.debug('缓存未命中', { symbol, cacheKey });

      // 阶段 2-5: 使用聚合器获取数据（带超时）
      const result = await this.withTimeout(
        dataAggregator.getQuote(symbol),
        opts.timeout,
        `getQuote(${symbol})`
      );

      // 阶段 6: 写入缓存
      this.cache.set(cacheKey, result, opts.cacheTTL);

      // 记录数据源选择和融合信息
      this.logger.info('数据获取完成', {
        symbol,
        source: result._source,
        sourceCount: result._sourceCount,
        price: (result as any).c,
        change: (result as any).dp,
      });

      // 记录融合指标
      if (result._sourceCount && result._sourceCount > 1) {
        telemetryCollector.recordAggregation(result._sourceCount);
      }

      return result;
    });
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
    return await this.logger.logPerformance('getProfile', async () => {
      const opts = { ...this.options, ...options };
      const cacheKey = CacheManager.keys.profile(symbol);

      // 阶段 1: 检查缓存
      this.logger.debug('检查缓存', { symbol, cacheKey });
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.recordCacheHit();
        telemetryCollector.recordCacheHit();
        this.logger.debug('缓存命中', { symbol, cacheKey });
        return cached;
      }

      this.recordCacheMiss();
      telemetryCollector.recordCacheMiss();
      this.logger.debug('缓存未命中', { symbol, cacheKey });

      // 阶段 2-5: 获取数据（带超时）
      const result = await this.withTimeout(
        dataAggregator.getProfile(symbol),
        opts.timeout,
        `getProfile(${symbol})`
      );

      // 阶段 6: 写入缓存
      this.cache.set(cacheKey, result, opts.cacheTTL);

      // 记录数据源选择和融合信息
      this.logger.info('公司资料获取完成', {
        symbol,
        source: result._source,
        sourceCount: result._sourceCount,
      });

      // 记录融合指标
      if (result._sourceCount && result._sourceCount > 1) {
        telemetryCollector.recordAggregation(result._sourceCount);
      }

      return result;
    });
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
    return await this.logger.logPerformance('searchStocks', async () => {
      const opts = { ...this.options, ...options };

      // 搜索结果通常不缓存（结果变化快）
      const result = await this.withTimeout(
        dataAggregator.searchStocks(query),
        opts.timeout,
        `searchStocks(${query})`
      );

      const resultCount = Array.isArray(result) ? result.length : 0;

      this.logger.info('股票搜索完成', {
        query,
        resultCount,
      });

      // 返回数组或空数组
      return Array.isArray(result) ? result : [];
    });
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
    return await this.logger.logPerformance('getFinancials', async () => {
      const opts = { ...this.options, ...options };
      const cacheKey = CacheManager.keys.financials(symbol);

      // 阶段 1: 检查缓存
      this.logger.debug('检查缓存', { symbol, cacheKey });
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.recordCacheHit();
        telemetryCollector.recordCacheHit();
        this.logger.debug('缓存命中', { symbol, cacheKey });
        return cached;
      }

      this.recordCacheMiss();
      telemetryCollector.recordCacheMiss();
      this.logger.debug('缓存未命中', { symbol, cacheKey });

      // 阶段 2-5: 获取数据（带超时）
      const result = await this.withTimeout(
        dataAggregator.getFinancials(symbol),
        opts.timeout,
        `getFinancials(${symbol})`
      );

      // 阶段 6: 写入缓存
      this.cache.set(cacheKey, result, opts.cacheTTL);

      // 记录数据源选择和融合信息
      this.logger.info('财务数据获取完成', {
        symbol,
        source: result._source,
        period: (result as any).period,
      });

      // 记录融合指标
      if (result._sourceCount && result._sourceCount > 1) {
        telemetryCollector.recordAggregation(result._sourceCount);
      }

      return result;
    });
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
    return await this.logger.logPerformance('getBatchQuotes', async () => {
      const opts = { ...this.options, ...options };

      this.logger.info('开始批量获取报价', { symbolsCount: symbols.length });

      // 并行获取所有报价
      const results = await Promise.all(
        symbols.map((symbol) =>
          this.getQuote(symbol, opts).catch((error) => {
            this.logger.error('批量获取失败', new Error(`获取 ${symbol} 失败: ${error.message}`));
            return null;
          })
        )
      );

      const successCount = results.filter((r): r is QuoteData => r !== null).length;

      this.logger.info('批量获取完成', {
        total: symbols.length,
        success: successCount,
        failed: symbols.length - successCount,
      });

      // 过滤掉失败的结果
      return results.filter((r): r is QuoteData => r !== null);
    });
  }

  /**
   * 使缓存失效
   *
   * @param pattern 缓存键模式（正则表达式字符串）
   */
  invalidateCache(pattern: string): void {
    this.cache.invalidate(pattern);
    this.logger.info('缓存失效', { pattern });
  }

  /**
   * 清空所有缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('缓存已清空');
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

    const startTime = Date.now();

    // 创建超时 Promise
    const timeoutPromise = new Promise<T>((_, reject) => {
      const timer = setTimeout(() => {
        if (this.options.enableStats) {
          this.stats.timeouts++;
        }

        // 记录超时降级事件
        telemetryCollector.recordFallback('timeout');

        this.logger.warn('操作超时', {
          operation,
          timeout: timeoutMs,
        });

        reject(new Error(`Operation timeout: ${operation} exceeded ${timeoutMs}ms`));
      }, timeoutMs);

      // 清理定时器
      promise.finally(() => clearTimeout(timer));
    });

    // 使用 Promise.race 实现超时控制
    try {
      const result = await Promise.race([promise, timeoutPromise]);

      // 记录成功的请求指标
      const duration = Date.now() - startTime;
      telemetryCollector.recordRequest('DataPipeline', duration, true);

      return result;
    } catch (error) {
      // 记录失败的请求指标
      const duration = Date.now() - startTime;
      telemetryCollector.recordRequest('DataPipeline', duration, false);

      this.logger.error('操作失败', error instanceof Error ? error : new Error(String(error)));
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
