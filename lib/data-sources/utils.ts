/**
 * 多数据源聚合系统 - 性能优化工具
 *
 * 提供请求去重、批量请求优化、并行处理等性能优化功能
 * @module data-sources/utils
 */

import { logger } from './logger';

/**
 * 批量请求选项
 */
export interface BatchOptions<T> {
  /** 批量大小（每次并行处理的请求数） */
  batchSize?: number;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 失败时是否继续处理其他请求 */
  continueOnError?: boolean;
  /** 进度回调 */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * 批量请求结果
 */
export interface BatchResult<T> {
  /** 成功的结果 */
  successes: Array<{ item: T; result: any; index: number }>;
  /** 失败的结果 */
  failures: Array<{ item: T; error: Error; index: number }>;
  /** 总耗时（毫秒） */
  duration: number;
}

/**
 * 请求去重器
 * 短时间内重复请求使用相同的 Promise
 */
export class RequestDeduplicator {
  /** 进行中的请求 Map */
  private pendingRequests: Map<string, Promise<any>>;

  /** 请求时间戳（用于清理过期条目） */
  private requestTimestamps: Map<string, number>;

  /** 清理间隔（毫秒） */
  private readonly CLEANUP_INTERVAL = 60000; // 1分钟

  /** 过期时间（毫秒） */
  private readonly EXPIRY_TIME = 5000; // 5秒

  constructor() {
    this.pendingRequests = new Map();
    this.requestTimestamps = new Map();

    // 定期清理过期条目
    if (typeof window === 'undefined') {
      // 仅在服务端启动定时清理
      setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
    }
  }

  /**
   * 去重请求
   * 如果有进行中的相同请求，返回相同的 Promise
   * 否则执行新请求并缓存 Promise
   *
   * @param key 请求唯一标识
   * @param fn 请求函数
   * @returns 请求结果
   */
  async dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // 检查是否有进行中的请求
    const existingPromise = this.pendingRequests.get(key);
    if (existingPromise) {
      logger.debug('RequestDeduplicator', `使用缓存的请求: ${key}`);
      return existingPromise as Promise<T>;
    }

    // 创建新请求
    const promise = fn().finally(() => {
      // 请求完成后延迟删除，避免瞬间重复请求
      setTimeout(() => {
        this.pendingRequests.delete(key);
        this.requestTimestamps.delete(key);
      }, this.EXPIRY_TIME);
    });

    // 缓存 Promise
    this.pendingRequests.set(key, promise);
    this.requestTimestamps.set(key, Date.now());

    return promise;
  }

  /**
   * 生成请求键
   * 基于操作类型和参数
   *
   * @param operation 操作类型
   * @param params 参数对象
   * @returns 请求键
   */
  static generateKey(operation: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((k) => `${k}:${params[k]}`)
      .join('|');
    return `${operation}:${sortedParams}`;
  }

  /**
   * 清理过期的请求条目
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, timestamp] of this.requestTimestamps.entries()) {
      if (now - timestamp > this.EXPIRY_TIME) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.pendingRequests.delete(key);
      this.requestTimestamps.delete(key);
    }

    if (keysToDelete.length > 0) {
      logger.debug('RequestDeduplicator', `清理了 ${keysToDelete.length} 个过期条目`);
    }
  }

  /**
   * 获取当前进行中的请求数量
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.pendingRequests.clear();
    this.requestTimestamps.clear();
  }
}

/**
 * 批量请求处理器
 * 将大量请求分批处理，避免一次性发起过多请求
 */
export class BatchProcessor {
  /** 默认批量大小 */
  private readonly DEFAULT_BATCH_SIZE = 10;

  /** 默认超时时间 */
  private readonly DEFAULT_TIMEOUT = 10000; // 10秒

  /**
   * 批量处理项目
   *
   * @param items 项目列表
   * @param processor 处理函数
   * @param options 批量选项
   * @returns 批量处理结果
   */
  async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options?: BatchOptions<T>
  ): Promise<BatchResult<T>> {
    const startTime = Date.now();
    const batchSize = options?.batchSize ?? this.DEFAULT_BATCH_SIZE;
    const timeout = options?.timeout ?? this.DEFAULT_TIMEOUT;
    const continueOnError = options?.continueOnError ?? false;

    const successes: Array<{ item: T; result: R; index: number }> = [];
    const failures: Array<{ item: T; error: Error; index: number }> = [];

    // 分批处理
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, Math.min(i + batchSize, items.length));

      const batchPromises = batch.map(async (item, batchIndex) => {
        const itemIndex = i + batchIndex;

        try {
          // 添加超时控制
          const result = await this.withTimeout(
            processor(item),
            timeout,
            `处理项目超时: ${JSON.stringify(item)}`
          );

          successes.push({ item, result, index: itemIndex });
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          failures.push({ item, error: err, index: itemIndex });

          if (!continueOnError) {
            throw err;
          }
        }
      });

      try {
        await Promise.all(batchPromises);
      } catch (error) {
        if (!continueOnError) {
          throw error;
        }
        // 继续处理下一批
      }

      // 报告进度
      if (options?.onProgress) {
        const completed = Math.min(i + batchSize, items.length);
        options.onProgress(completed, items.length);
      }

      // 批次间添加小延迟，避免请求过于密集
      if (i + batchSize < items.length) {
        await this.delay(100); // 100ms 延迟
      }
    }

    const duration = Date.now() - startTime;

    logger.info('BatchProcessor', `批量处理完成: ${items.length} 个项目`, {
      successes: successes.length,
      failures: failures.length,
      duration: `${duration}ms`,
    });

    return { successes, failures, duration };
  }

  /**
   * 并行处理多个项目（无批量限制）
   * 适用于少量项目或需要快速完成的场景
   *
   * @param items 项目列表
   * @param processor 处理函数
   * @param options 选项
   * @returns 处理结果
   */
  async processParallel<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options?: Pick<BatchOptions<T>, 'timeout' | 'continueOnError'>
  ): Promise<BatchResult<T>> {
    const startTime = Date.now();
    const timeout = options?.timeout ?? this.DEFAULT_TIMEOUT;
    const continueOnError = options?.continueOnError ?? false;

    const successes: Array<{ item: T; result: R; index: number }> = [];
    const failures: Array<{ item: T; error: Error; index: number }> = [];

    const promises = items.map(async (item, index) => {
      try {
        const result = await this.withTimeout(
          processor(item),
          timeout,
          `处理项目超时: ${JSON.stringify(item)}`
        );
        successes.push({ item, result, index });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        failures.push({ item, error: err, index });

        if (!continueOnError) {
          throw err;
        }
      }
    });

    try {
      await Promise.all(promises);
    } catch (error) {
      if (!continueOnError) {
        throw error;
      }
    }

    const duration = Date.now() - startTime;

    logger.info('BatchProcessor', `并行处理完成: ${items.length} 个项目`, {
      successes: successes.length,
      failures: failures.length,
      duration: `${duration}ms`,
    });

    return { successes, failures, duration };
  }

  /**
   * 为 Promise 添加超时
   *
   * @param promise Promise 对象
   * @param timeoutMs 超时时间（毫秒）
   * @param errorMessage 超时错误消息
   * @returns Promise 结果
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      ),
    ]);
  }

  /**
   * 延迟执行
   *
   * @param ms 延迟时间（毫秒）
   * @returns Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 股票代码分组工具
 * 将股票代码按数据源分组，优化批量请求
 */
export class SymbolGrouper {
  /**
   * 按市场分组股票代码
   *
   * @param symbols 股票代码列表
   * @returns 按市场分组的代码
   */
  groupByMarket(symbols: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {
      US: [],
      CN: [],
      HK: [],
      OTHER: [],
    };

    for (const symbol of symbols) {
      if (this.isAStock(symbol)) {
        groups.CN.push(symbol);
      } else if (this.isHKStock(symbol)) {
        groups.HK.push(symbol);
      } else if (/^[A-Za-z]+$/.test(symbol)) {
        groups.US.push(symbol);
      } else {
        groups.OTHER.push(symbol);
      }
    }

    // 移除空组
    return Object.fromEntries(
      Object.entries(groups).filter(([_, symbols]) => symbols.length > 0)
    );
  }

  /**
   * 判断是否为 A 股代码
   */
  private isAStock(symbol: string): boolean {
    return /^\d{6}\.(SH|SZ)$/.test(symbol);
  }

  /**
   * 判断是否为港股代码
   */
  private isHKStock(symbol: string): boolean {
    return /^\d{4,5}\.HK$/.test(symbol);
  }

  /**
   * 智能批量分组
   * 考虑数据源支持和市场特性
   *
   * @param symbols 股票代码列表
   * @param maxBatchSize 每批最大数量
   * @returns 批次列表
   */
  createBatches(symbols: string[], maxBatchSize = 50): string[][] {
    const batches: string[][] = [];
    const marketGroups = this.groupByMarket(symbols);

    // 为每个市场创建批次
    for (const [market, marketSymbols] of Object.entries(marketGroups)) {
      for (let i = 0; i < marketSymbols.length; i += maxBatchSize) {
        batches.push(marketSymbols.slice(i, i + maxBatchSize));
      }
    }

    return batches;
  }
}

/**
 * 性能监控工具
 * 跟踪操作耗时和资源使用
 */
export class PerformanceMonitor {
  /** 计时器存储 */
  private timers: Map<string, number>;

  /** 统计数据存储 */
  private stats: Map<string, { count: number; totalTime: number; min: number; max: number }>;

  constructor() {
    this.timers = new Map();
    this.stats = new Map();
  }

  /**
   * 开始计时
   *
   * @param label 计时标签
   */
  start(label: string): void {
    this.timers.set(label, performance.now());
  }

  /**
   * 结束计时并记录
   *
   * @param label 计时标签
   * @returns 耗时（毫秒）
   */
  end(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      logger.warn('PerformanceMonitor', `计时器不存在: ${label}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(label);

    // 更新统计数据
    const existing = this.stats.get(label) ?? {
      count: 0,
      totalTime: 0,
      min: Infinity,
      max: 0,
    };

    this.stats.set(label, {
      count: existing.count + 1,
      totalTime: existing.totalTime + duration,
      min: Math.min(existing.min, duration),
      max: Math.max(existing.max, duration),
    });

    return duration;
  }

  /**
   * 获取统计数据
   *
   * @param label 标签（可选）
   * @returns 统计数据
   */
  getStats(label?: string): {
    count: number;
    totalTime: number;
    average: number;
    min: number;
    max: number;
  } | null {
    if (label) {
      const stat = this.stats.get(label);
      if (!stat) return null;

      return {
        count: stat.count,
        totalTime: stat.totalTime,
        average: stat.totalTime / stat.count,
        min: stat.min === Infinity ? 0 : stat.min,
        max: stat.max,
      };
    }

    // 返回所有统计的汇总
    const allStats = Array.from(this.stats.values());
    if (allStats.length === 0) return null;

    return {
      count: allStats.reduce((sum, s) => sum + s.count, 0),
      totalTime: allStats.reduce((sum, s) => sum + s.totalTime, 0),
      average: allStats.reduce((sum, s) => sum + s.totalTime, 0) / allStats.reduce((sum, s) => sum + s.count, 0),
      min: Math.min(...allStats.map(s => s.min === Infinity ? 0 : s.min)),
      max: Math.max(...allStats.map(s => s.max)),
    };
  }

  /**
   * 测量异步函数执行时间
   *
   * @param label 标签
   * @param fn 异步函数
   * @returns 函数结果
   */
  async measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      return await fn();
    } finally {
      this.end(label);
    }
  }

  /**
   * 清空所有数据
   */
  clear(): void {
    this.timers.clear();
    this.stats.clear();
  }
}

/**
 * 导出单例实例
 */
export const requestDeduplicator = new RequestDeduplicator();
export const batchProcessor = new BatchProcessor();
export const symbolGrouper = new SymbolGrouper();
export const performanceMonitor = new PerformanceMonitor();
