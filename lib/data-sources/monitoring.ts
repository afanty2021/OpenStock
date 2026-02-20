/**
 * 多数据源聚合系统 - 监控指标收集
 *
 * 收集和追踪数据源性能指标、缓存指标和融合指标
 * @module data-sources/monitoring
 */

import { ErrorType } from './error-handler';

/**
 * 数据源遥测指标
 */
export interface TelemetryMetrics {
  /** 数据源名称 */
  source: string;

  /** 成功率 (0-100) */
  successRate: number;

  /** 平均响应时间 (毫秒) */
  avgResponseTime: number;

  /** 错误计数 */
  errorCount: number;

  /** 最后错误时间戳 */
  lastErrorTime?: number;

  /** 限流命中次数 */
  rateLimitHits: number;

  /** 总请求次数 */
  totalRequests: number;

  /** 成功请求次数 */
  successRequests: number;

  /** 最后更新时间 */
  lastUpdated: number;
}

/**
 * 缓存指标
 */
export interface CacheMetrics {
  /** 缓存命中次数 */
  hits: number;

  /** 缓存未命中次数 */
  misses: number;

  /** 缓存命中率 (0-100) */
  hitRate: number;

  /** 当前缓存条目数 */
  size: number;

  /** 缓存驱逐次数 */
  evictions: number;
}

/**
 * 融合指标
 */
export interface AggregationMetrics {
  /** 融合操作总次数 */
  totalOperations: number;

  /** 参与融合的平均数据源数量 */
  avgSourcesPerOperation: number;

  /** 降级事件总数 */
  fallbackCount: number;

  /** 按降级级别统计的事件 */
  fallbackByLevel: Map<string, number>;

  /** 最后更新时间 */
  lastUpdated: number;
}

/**
 * 系统健康状态
 */
export interface SystemHealth {
  /** 是否健康 */
  healthy: boolean;

  /** 健康评分 (0-100) */
  score: number;

  /** 问题列表 */
  issues: string[];

  /** 检查时间 */
  checkedAt: number;
}

/**
 * 遥测收集器配置
 */
export interface TelemetryConfig {
  /** 最大历史记录数（内存保护） */
  maxHistorySize: number;

  /** 成功率低阈值 */
  lowSuccessRateThreshold: number;

  /** 响应时间高阈值（毫秒） */
  highResponseTimeThreshold: number;

  /** 错误计数高阈值 */
  highErrorCountThreshold: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: TelemetryConfig = {
  maxHistorySize: 10000,
  lowSuccessRateThreshold: 80,
  highResponseTimeThreshold: 2000,
  highErrorCountThreshold: 10,
};

/**
 * 遥测收集器
 *
 * 收集和管理数据源的性能指标、缓存指标和融合指标
 */
export class TelemetryCollector {
  /** 数据源指标 */
  private metrics: Map<string, TelemetryMetrics> = new Map();

  /** 缓存指标 */
  private cacheMetrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    evictions: 0,
  };

  /** 融合指标 */
  private aggregationMetrics: AggregationMetrics = {
    totalOperations: 0,
    avgSourcesPerOperation: 0,
    fallbackCount: 0,
    fallbackByLevel: new Map(),
    lastUpdated: Date.now(),
  };

  /** 响应时间历史（用于计算移动平均） */
  private responseTimeHistory: Map<string, number[]> = new Map();

  /** 配置 */
  private config: TelemetryConfig;

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 记录数据源请求
   *
   * @param source 数据源名称
   * @param duration 请求持续时间（毫秒）
   * @param success 是否成功
   * @param errorType 错误类型（如果失败）
   */
  recordRequest(
    source: string,
    duration: number,
    success: boolean,
    errorType?: ErrorType
  ): void {
    const now = Date.now();
    let metrics = this.metrics.get(source);

    if (!metrics) {
      metrics = {
        source,
        successRate: 100,
        avgResponseTime: duration,
        errorCount: 0,
        totalRequests: 0,
        successRequests: 0,
        lastUpdated: now,
      };
      this.metrics.set(source, metrics);
    }

    // 更新请求计数
    metrics.totalRequests++;
    if (success) {
      metrics.successRequests++;
    } else {
      metrics.errorCount++;
      metrics.lastErrorTime = now;

      // 如果是限流错误，增加计数
      if (errorType === ErrorType.API_RATE_LIMIT) {
        metrics.rateLimitHits++;
      }
    }

    // 更新成功率（使用指数移动平均）
    const currentSuccess = success ? 1 : 0;
    const alpha = 0.1; // 平滑因子
    metrics.successRate =
      metrics.successRate * (1 - alpha) + currentSuccess * 100 * alpha;

    // 更新平均响应时间
    this.updateResponseTime(source, duration);

    metrics.lastUpdated = now;
  }

  /**
   * 更新响应时间（使用移动平均）
   *
   * @param source 数据源名称
   * @param duration 响应时间
   */
  private updateResponseTime(source: string, duration: number): void {
    let history = this.responseTimeHistory.get(source);

    if (!history) {
      history = [];
      this.responseTimeHistory.set(source, history);
    }

    // 添加新的响应时间
    history.push(duration);

    // 限制历史大小
    if (history.length > 100) {
      history.shift();
    }

    // 计算平均响应时间
    const avg = history.reduce((sum, t) => sum + t, 0) / history.length;
    this.metrics.get(source)!.avgResponseTime = Math.round(avg);
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit(): void {
    this.cacheMetrics.hits++;
    this.updateCacheHitRate();
  }

  /**
   * 记录缓存未命中
   */
  recordCacheMiss(): void {
    this.cacheMetrics.misses++;
    this.updateCacheHitRate();
  }

  /**
   * 更新缓存命中率
   */
  private updateCacheHitRate(): void {
    const total = this.cacheMetrics.hits + this.cacheMetrics.misses;
    if (total > 0) {
      this.cacheMetrics.hitRate =
        (this.cacheMetrics.hits / total) * 100;
    }
  }

  /**
   * 更新缓存大小
   *
   * @param size 当前缓存条目数
   */
  updateCacheSize(size: number): void {
    this.cacheMetrics.size = size;
  }

  /**
   * 记录缓存驱逐
   */
  recordCacheEviction(): void {
    this.cacheMetrics.evictions++;
  }

  /**
   * 记录融合操作
   *
   * @param sourceCount 参与融合的数据源数量
   */
  recordAggregation(sourceCount: number): void {
    const metrics = this.aggregationMetrics;
    metrics.totalOperations++;

    // 更新平均数据源数量
    const alpha = 0.1;
    metrics.avgSourcesPerOperation =
      metrics.avgSourcesPerOperation * (1 - alpha) + sourceCount * alpha;

    metrics.lastUpdated = Date.now();
  }

  /**
   * 记录降级事件
   *
   * @param level 降级级别
   */
  recordFallback(level: string): void {
    const metrics = this.aggregationMetrics;
    metrics.fallbackCount++;

    const count = metrics.fallbackByLevel.get(level) || 0;
    metrics.fallbackByLevel.set(level, count + 1);

    metrics.lastUpdated = Date.now();
  }

  /**
   * 获取所有数据源指标
   *
   * @returns 数据源指标数组
   */
  getMetrics(): TelemetryMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * 获取特定数据源指标
   *
   * @param source 数据源名称
   * @returns 数据源指标
   */
  getSourceMetrics(source: string): TelemetryMetrics | undefined {
    return this.metrics.get(source);
  }

  /**
   * 获取缓存指标
   *
   * @returns 缓存指标
   */
  getCacheMetrics(): CacheMetrics {
    return { ...this.cacheMetrics };
  }

  /**
   * 获取融合指标
   *
   * @returns 融合指标
   */
  getAggregationMetrics(): Omit<AggregationMetrics, 'fallbackByLevel'> & {
    fallbackByLevel: Record<string, number>;
  } {
    return {
      ...this.aggregationMetrics,
      fallbackByLevel: Object.fromEntries(
        this.aggregationMetrics.fallbackByLevel
      ),
    };
  }

  /**
   * 检查系统健康状态
   *
   * @returns 系统健康状态
   */
  checkSystemHealth(): SystemHealth {
    const issues: string[] = [];
    let score = 100;

    // 检查所有数据源
    for (const [source, metrics] of this.metrics) {
      // 检查成功率
      if (metrics.successRate < this.config.lowSuccessRateThreshold) {
        issues.push(
          `${source}: 成功率低 (${metrics.successRate.toFixed(1)}%)`
        );
        score -= 10;
      }

      // 检查响应时间
      if (metrics.avgResponseTime > this.config.highResponseTimeThreshold) {
        issues.push(
          `${source}: 响应时间长 (${metrics.avgResponseTime}ms)`
        );
        score -= 5;
      }

      // 检查错误计数
      if (metrics.errorCount > this.config.highErrorCountThreshold) {
        issues.push(`${source}: 错误次数多 (${metrics.errorCount})`);
        score -= 15;
      }

      // 检查限流
      if (metrics.rateLimitHits > 0) {
        issues.push(`${source}: 遇到限流 (${metrics.rateLimitHits} 次)`);
        score -= 5;
      }
    }

    // 检查缓存命中率
    if (
      this.cacheMetrics.hits + this.cacheMetrics.misses > 100 &&
      this.cacheMetrics.hitRate < 50
    ) {
      issues.push(`缓存命中率低 (${this.cacheMetrics.hitRate.toFixed(1)}%)`);
      score -= 10;
    }

    // 确保分数在 0-100 范围内
    score = Math.max(0, Math.min(100, score));

    return {
      healthy: score >= 70,
      score,
      issues,
      checkedAt: Date.now(),
    };
  }

  /**
   * 获取性能摘要
   *
   * @returns 性能摘要字符串
   */
  getPerformanceSummary(): string {
    const lines: string[] = [];
    lines.push('=== 数据源性能摘要 ===\n');

    for (const metrics of this.metrics.values()) {
      lines.push(
        `${metrics.source}:` +
          `\n  成功率: ${metrics.successRate.toFixed(1)}%` +
          `\n  平均响应: ${metrics.avgResponseTime}ms` +
          `\n  总请求: ${metrics.totalRequests}` +
          `\n  错误: ${metrics.errorCount}` +
          `\n  限流: ${metrics.rateLimitHits}`
      );
    }

    lines.push('\n=== 缓存统计 ===');
    lines.push(
      `命中率: ${this.cacheMetrics.hitRate.toFixed(1)}% ` +
        `(${this.cacheMetrics.hits}/${this.cacheMetrics.hits + this.cacheMetrics.misses})`
    );
    lines.push(`缓存大小: ${this.cacheMetrics.size}`);
    lines.push(`驱逐次数: ${this.cacheMetrics.evictions}`);

    lines.push('\n=== 融合统计 ===');
    const agg = this.aggregationMetrics;
    lines.push(`融合操作: ${agg.totalOperations}`);
    lines.push(`平均数据源: ${agg.avgSourcesPerOperation.toFixed(1)}`);
    lines.push(`降级事件: ${agg.fallbackCount}`);

    return lines.join('\n');
  }

  /**
   * 重置所有指标
   */
  reset(): void {
    this.metrics.clear();
    this.responseTimeHistory.clear();
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      evictions: 0,
    };
    this.aggregationMetrics = {
      totalOperations: 0,
      avgSourcesPerOperation: 0,
      fallbackCount: 0,
      fallbackByLevel: new Map(),
      lastUpdated: Date.now(),
    };
  }

  /**
   * 重置特定数据源指标
   *
   * @param source 数据源名称
   */
  resetSource(source: string): void {
    this.metrics.delete(source);
    this.responseTimeHistory.delete(source);
  }

  /**
   * 获取按性能排序的数据源列表
   *
   * @param sortBy 排序依据
   * @returns 排序后的数据源列表
   */
  getRankedSources(
    sortBy: 'successRate' | 'responseTime' | 'errorCount' = 'successRate'
  ): Array<{ source: string; value: number }> {
    return Array.from(this.metrics.entries())
      .map(([source, metrics]) => ({
        source,
        value:
          sortBy === 'successRate'
            ? metrics.successRate
            : sortBy === 'responseTime'
            ? -metrics.avgResponseTime // 负值用于升序排序
            : -metrics.errorCount,
      }))
      .sort((a, b) => b.value - a.value)
      .map(({ source, value }) => ({ source, value: Math.abs(value) }));
  }
}

/**
 * 单例实例
 */
export const telemetryCollector = new TelemetryCollector();

/**
 * 性能监控装饰器
 *
 * 自动记录函数执行时间和结果
 *
 * @param source 数据源名称
 * @param operation 操作名称
 */
export function monitorPerformance(source: string, operation?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let success = true;
      let errorType: ErrorType | undefined;

      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } catch (error) {
        success = false;
        // 尝试从错误中提取类型
        if (error instanceof Error) {
          if (error.message.includes('rate limit')) {
            errorType = ErrorType.API_RATE_LIMIT;
          } else if (error.message.includes('timeout')) {
            errorType = ErrorType.TIMEOUT;
          } else if (error.message.includes('network')) {
            errorType = ErrorType.NETWORK_ERROR;
          }
        }
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        telemetryCollector.recordRequest(source, duration, success, errorType);
      }
    };

    return descriptor;
  };
}
