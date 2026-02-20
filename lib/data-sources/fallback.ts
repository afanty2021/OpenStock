/**
 * 多数据源聚合系统 - 降级策略
 *
 * 实现三级降级机制：
 * L1: 尝试所有数据源（正常流程）
 * L2: 降级到过期的缓存数据
 * L3: 返回默认值（零值）
 * @module data-sources/fallback
 */

import type { QuoteData, ProfileData, SearchResult, FinancialData } from './types';
import { CacheManager } from './cache';
import { dataPipeline } from './pipeline';

/**
 * 降级级别枚举
 */
export enum FallbackLevel {
  /** L1: 正常数据源 */
  PRIMARY = 'primary',
  /** L2: 过期缓存 */
  EXPIRED_CACHE = 'expired_cache',
  /** L3: 默认值 */
  DEFAULT = 'default',
}

/**
 * 降级结果统计
 */
interface FallbackStats {
  /** 总请求数 */
  totalRequests: number;
  /** L1 命中次数 */
  primaryHits: number;
  /** L2 命中次数 */
  expiredCacheHits: number;
  /** L3 命中次数 */
  defaultHits: number;
  /** 完全失败次数（L3也无法提供） */
  completeFailures: number;
}

/**
 * 带降级信息的数据结果
 */
interface FallbackResult<T> {
  /** 数据内容 */
  data: T;
  /** 降级级别 */
  fallbackLevel: FallbackLevel;
  /** 是否使用了降级 */
  isFallback: boolean;
  /** 数据来源描述 */
  source: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 降级策略配置
 */
interface FallbackOptions {
  /** 是否允许使用过期缓存 */
  allowExpiredCache?: boolean;
  /** 是否在降级时记录详细日志 */
  verboseLogging?: boolean;
  /** 是否启用统计 */
  enableStats?: boolean;
}

/**
 * 降级策略类
 *
 * 提供三级降级机制确保服务可用性
 */
export class FallbackStrategy {
  private cache: CacheManager;
  private stats: FallbackStats;
  private options: Required<FallbackOptions>;

  /**
   * 默认配置
   */
  private static readonly DEFAULT_OPTIONS: Required<FallbackOptions> = {
    allowExpiredCache: true,
    verboseLogging: true,
    enableStats: true,
  };

  constructor(options?: FallbackOptions) {
    this.options = { ...FallbackStrategy.DEFAULT_OPTIONS, ...options };
    this.cache = new CacheManager();
    this.stats = {
      totalRequests: 0,
      primaryHits: 0,
      expiredCacheHits: 0,
      defaultHits: 0,
      completeFailures: 0,
    };
  }

  /**
   * 获取股票报价（带降级）
   *
   * 降级流程：
   * L1: 尝试从数据管道获取最新数据
   * L2: 失败时尝试使用过期缓存
   * L3: 再失败时返回默认零值
   *
   * @param symbol 股票代码
   * @returns 带降级信息的股票报价
   */
  async getQuoteWithFallback(symbol: string): Promise<FallbackResult<QuoteData>> {
    this.recordRequest();
    const cacheKey = CacheManager.keys.quote(symbol);

    try {
      // L1: 尝试所有数据源（正常流程）
      this.log('L1-attempt', { symbol, message: '尝试从主数据源获取数据' });
      const quote = await dataPipeline.getQuote(symbol);
      this.recordPrimaryHit();

      return {
        data: quote,
        fallbackLevel: FallbackLevel.PRIMARY,
        isFallback: false,
        source: quote._source,
        timestamp: Date.now(),
      };
    } catch (primaryError) {
      this.log('L1-failed', {
        symbol,
        error: primaryError instanceof Error ? primaryError.message : String(primaryError),
        message: '主数据源失败，进入 L2 降级',
      });

      // L2: 降级到过期的缓存数据
      if (this.options.allowExpiredCache) {
        const expiredCached = this.cache.get(cacheKey, { allowExpired: true });
        if (expiredCached) {
          this.recordExpiredCacheHit();
          this.log('L2-success', {
            symbol,
            message: '使用过期缓存数据',
            cacheAge: this.calculateCacheAge(expiredCached.t),
          });

          return {
            data: {
              ...expiredCached,
              _source: 'expired_cache',
              _fallback: true,
            },
            fallbackLevel: FallbackLevel.EXPIRED_CACHE,
            isFallback: true,
            source: 'expired_cache',
            timestamp: Date.now(),
          };
        }
      }

      this.log('L2-failed', {
        symbol,
        message: '无可用缓存数据，进入 L3 降级',
      });

      // L3: 返回默认值
      const defaultQuote = this.createDefaultQuote(symbol);
      this.recordDefaultHit();
      this.log('L3-success', {
        symbol,
        message: '使用默认零值数据',
      });

      return {
        data: defaultQuote,
        fallbackLevel: FallbackLevel.DEFAULT,
        isFallback: true,
        source: 'default',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 获取公司资料（带降级）
   *
   * @param symbol 股票代码
   * @returns 带降级信息的公司资料
   */
  async getProfileWithFallback(symbol: string): Promise<FallbackResult<ProfileData>> {
    this.recordRequest();
    const cacheKey = CacheManager.keys.profile(symbol);

    try {
      // L1: 尝试所有数据源
      this.log('L1-attempt-profile', { symbol, message: '尝试获取公司资料' });
      const profile = await dataPipeline.getProfile(symbol);
      this.recordPrimaryHit();

      return {
        data: profile,
        fallbackLevel: FallbackLevel.PRIMARY,
        isFallback: false,
        source: profile._source,
        timestamp: Date.now(),
      };
    } catch (primaryError) {
      this.log('L1-failed-profile', {
        symbol,
        error: primaryError instanceof Error ? primaryError.message : String(primaryError),
      });

      // L2: 尝试过期缓存
      if (this.options.allowExpiredCache) {
        const expiredCached = this.cache.get(cacheKey, { allowExpired: true });
        if (expiredCached) {
          this.recordExpiredCacheHit();
          this.log('L2-success-profile', { symbol, message: '使用过期缓存资料' });

          return {
            data: {
              ...expiredCached,
              _source: 'expired_cache',
            },
            fallbackLevel: FallbackLevel.EXPIRED_CACHE,
            isFallback: true,
            source: 'expired_cache',
            timestamp: Date.now(),
          };
        }
      }

      // L3: 返回最小可用资料
      const minimalProfile = this.createMinimalProfile(symbol);
      this.recordDefaultHit();
      this.log('L3-success-profile', { symbol, message: '使用最小资料' });

      return {
        data: minimalProfile,
        fallbackLevel: FallbackLevel.DEFAULT,
        isFallback: true,
        source: 'default',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 搜索股票（带降级）
   *
   * @param query 搜索关键词
   * @returns 带降级信息的搜索结果
   */
  async searchStocksWithFallback(query: string): Promise<FallbackResult<SearchResult[]>> {
    this.recordRequest();

    try {
      // L1: 正常搜索
      this.log('L1-attempt-search', { query, message: '尝试搜索股票' });
      const results = await dataPipeline.searchStocks(query);
      this.recordPrimaryHit();

      return {
        data: results,
        fallbackLevel: FallbackLevel.PRIMARY,
        isFallback: false,
        source: 'primary',
        timestamp: Date.now(),
      };
    } catch (primaryError) {
      this.log('L1-failed-search', {
        query,
        error: primaryError instanceof Error ? primaryError.message : String(primaryError),
      });

      // L2/L3: 搜索不支持缓存或默认值，返回空数组
      this.recordDefaultHit();
      this.log('L3-success-search', { query, message: '搜索失败，返回空结果' });

      return {
        data: [],
        fallbackLevel: FallbackLevel.DEFAULT,
        isFallback: true,
        source: 'default',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 获取财务数据（带降级）
   *
   * @param symbol 股票代码
   * @returns 带降级信息的财务数据
   */
  async getFinancialsWithFallback(symbol: string): Promise<FallbackResult<FinancialData>> {
    this.recordRequest();
    const cacheKey = CacheManager.keys.financials(symbol);

    try {
      // L1: 正常获取
      this.log('L1-attempt-financials', { symbol, message: '尝试获取财务数据' });
      const financials = await dataPipeline.getFinancials(symbol);
      this.recordPrimaryHit();

      return {
        data: financials,
        fallbackLevel: FallbackLevel.PRIMARY,
        isFallback: false,
        source: financials._source,
        timestamp: Date.now(),
      };
    } catch (primaryError) {
      this.log('L1-failed-financials', {
        symbol,
        error: primaryError instanceof Error ? primaryError.message : String(primaryError),
      });

      // L2: 尝试过期缓存
      if (this.options.allowExpiredCache) {
        const expiredCached = this.cache.get(cacheKey, { allowExpired: true });
        if (expiredCached) {
          this.recordExpiredCacheHit();
          this.log('L2-success-financials', { symbol, message: '使用过期缓存财务数据' });

          return {
            data: {
              ...expiredCached,
              _source: 'expired_cache',
            },
            fallbackLevel: FallbackLevel.EXPIRED_CACHE,
            isFallback: true,
            source: 'expired_cache',
            timestamp: Date.now(),
          };
        }
      }

      // L3: 返回空财务数据
      const emptyFinancials = this.createEmptyFinancials(symbol);
      this.recordDefaultHit();
      this.log('L3-success-financials', { symbol, message: '使用空财务数据' });

      return {
        data: emptyFinancials,
        fallbackLevel: FallbackLevel.DEFAULT,
        isFallback: true,
        source: 'default',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 批量获取股票报价（带降级）
   *
   * 对每个股票独立应用降级策略
   *
   * @param symbols 股票代码数组
   * @returns 带降级信息的股票报价数组
   */
  async getBatchQuotesWithFallback(symbols: string[]): Promise<FallbackResult<QuoteData>[]> {
    this.log('batch-attempt', {
      count: symbols.length,
      message: `批量获取 ${symbols.length} 个股票报价`,
    });

    // 并行处理所有股票
    const results = await Promise.all(
      symbols.map((symbol) => this.getQuoteWithFallback(symbol))
    );

    // 统计降级分布
    const distribution = this.analyzeFallbackDistribution(results);
    this.log('batch-complete', {
      total: results.length,
      distribution,
    });

    return results;
  }

  /**
   * 获取降级统计信息
   *
   * @returns 统计数据
   */
  getStats(): FallbackStats {
    return { ...this.stats };
  }

  /**
   * 获取降级分布统计
   *
   * @returns 各级别百分比
   */
  getFallbackDistribution(): {
    primary: number;
    expiredCache: number;
    default: number;
  } {
    const total = this.stats.totalRequests;
    if (total === 0) {
      return { primary: 0, expiredCache: 0, default: 0 };
    }

    return {
      primary: this.stats.primaryHits / total,
      expiredCache: this.stats.expiredCacheHits / total,
      default: this.stats.defaultHits / total,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      primaryHits: 0,
      expiredCacheHits: 0,
      defaultHits: 0,
      completeFailures: 0,
    };
  }

  /**
   * 创建默认股票报价（零值）
   *
   * @param symbol 股票代码
   * @returns 默认报价数据
   */
  private createDefaultQuote(symbol: string): QuoteData {
    return {
      symbol,
      c: 0,      // 当前价格
      d: 0,      // 涨跌额
      dp: 0,     // 涨跌幅
      h: 0,      // 最高价
      l: 0,      // 最低价
      o: 0,      // 开盘价
      pc: 0,     // 前收盘价
      t: Date.now() / 1000,
      _source: 'default',
      _fallback: true,
    };
  }

  /**
   * 创建最小公司资料
   *
   * @param symbol 股票代码
   * @returns 最小公司资料
   */
  private createMinimalProfile(symbol: string): ProfileData {
    return {
      symbol,
      name: symbol, // 使用股票代码作为名称
      exchange: 'UNKNOWN',
      _source: 'default',
    };
  }

  /**
   * 创建空财务数据
   *
   * @param symbol 股票代码
   * @returns 空财务数据
   */
  private createEmptyFinancials(symbol: string): FinancialData {
    return {
      symbol,
      period: new Date().toISOString().slice(0, 7), // 当前月份
      _source: 'default',
    };
  }

  /**
   * 计算缓存数据年龄（秒）
   *
   * @param timestamp 数据时间戳
   * @returns 年龄（秒）
   */
  private calculateCacheAge(timestamp: number): number {
    return Math.floor((Date.now() - timestamp * 1000) / 1000);
  }

  /**
   * 分析降级结果分布
   *
   * @param results 降级结果数组
   * @returns 分布统计
   */
  private analyzeFallbackDistribution<T>(results: FallbackResult<T>[]): {
    primary: number;
    expiredCache: number;
    default: number;
  } {
    const distribution = {
      primary: 0,
      expiredCache: 0,
      default: 0,
    };

    for (const result of results) {
      switch (result.fallbackLevel) {
        case FallbackLevel.PRIMARY:
          distribution.primary++;
          break;
        case FallbackLevel.EXPIRED_CACHE:
          distribution.expiredCache++;
          break;
        case FallbackLevel.DEFAULT:
          distribution.default++;
          break;
      }
    }

    return distribution;
  }

  /**
   * 记录请求
   */
  private recordRequest(): void {
    if (this.options.enableStats) {
      this.stats.totalRequests++;
    }
  }

  /**
   * 记录 L1 命中
   */
  private recordPrimaryHit(): void {
    if (this.options.enableStats) {
      this.stats.primaryHits++;
    }
  }

  /**
   * 记录 L2 命中
   */
  private recordExpiredCacheHit(): void {
    if (this.options.enableStats) {
      this.stats.expiredCacheHits++;
    }
  }

  /**
   * 记录 L3 命中
   */
  private recordDefaultHit(): void {
    if (this.options.enableStats) {
      this.stats.defaultHits++;
    }
  }

  /**
   * 日志记录
   *
   * @param level 日志级别/操作
   * @param data 日志数据
   */
  private log(level: string, data: Record<string, unknown>): void {
    if (this.options.verboseLogging) {
      const timestamp = new Date().toISOString();
      // eslint-disable-next-line no-console
      console.log(`[FallbackStrategy ${timestamp}] ${level}:`, data);
    }
  }
}

/**
 * 导出单例实例
 * 整个应用应使用此实例访问降级策略
 */
export const fallbackStrategy = new FallbackStrategy({
  allowExpiredCache: true, // 允许使用过期缓存
  verboseLogging: process.env.NODE_ENV === 'development', // 开发环境详细日志
  enableStats: true, // 启用统计
});
