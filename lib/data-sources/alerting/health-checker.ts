/**
 * 智能自适应健康检查器
 *
 * 根据数据源健康状态动态调整检查频率
 * @module data-sources/alerting/health-checker
 */

import type {
  AdaptiveCheckConfig,
  HealthStatus,
  SourceHealthStatus,
  TelemetryMetrics,
} from './types';
import { telemetryCollector } from '../monitoring';
import { alertManager } from './alert-manager';
import { MonitoringLogQueries } from '../../../database/models/alert-history.model';
import { logger } from '../logger';

/**
 * 默认自适应检查配置（用户选择：智能自适应）
 */
const DEFAULT_ADAPTIVE_CONFIG: AdaptiveCheckConfig = {
  healthyInterval: 60 * 60 * 1000, // 1小时
  degradedInterval: 5 * 60 * 1000, // 5分钟
  criticalInterval: 60 * 1000, // 1分钟
};

/**
 * 健康状态判定阈值
 */
const HEALTH_THRESHOLDS = {
  // 危急状态
  critical: {
    maxSuccessRate: 0.3,
    minErrorCount: 10,
    maxResponseTime: 10000,
  },
  // 降级状态
  degraded: {
    maxSuccessRate: 0.8,
    minErrorCount: 3,
    maxResponseTime: 2000,
  },
  // 健康状态
  healthy: {
    minSuccessRate: 0.95,
    maxErrorCount: 2,
    maxResponseTime: 1000,
  },
};

/**
 * 数据源健康检查状态
 */
interface SourceCheckState {
  source: string;
  status: HealthStatus;
  lastCheck: number;
  nextCheck: number;
  consecutiveFails: number;
  consecutiveSuccesses: number;
}

/**
 * 智能自适应健康检查器
 */
export class AdaptiveHealthChecker {
  private config: AdaptiveCheckConfig;
  private checkStates: Map<string, SourceCheckState>;
  private checkTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private sources: string[] = [];

  constructor(config?: Partial<AdaptiveCheckConfig>) {
    this.config = {
      ...DEFAULT_ADAPTIVE_CONFIG,
      ...config,
    };
    this.checkStates = new Map();
  }

  /**
   * 启动健康检查
   */
  start(sources: string[]): void {
    if (this.isRunning) {
      logger.warn('健康检查器已在运行');
      return;
    }

    this.sources = sources;
    this.isRunning = true;

    // 初始化检查状态
    for (const source of sources) {
      this.checkStates.set(source, {
        source,
        status: 'healthy',
        lastCheck: 0,
        nextCheck: Date.now(),
        consecutiveFails: 0,
        consecutiveSuccesses: 0,
      });
    }

    logger.info(`健康检查器已启动，监控 ${sources.length} 个数据源`);

    // 开始检查循环
    this.scheduleNextCheck();
  }

  /**
   * 停止健康检查
   */
  stop(): void {
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = null;
    }
    this.isRunning = false;
    logger.info('健康检查器已停止');
  }

  /**
   * 安排下一次检查
   */
  private scheduleNextCheck(): void {
    if (!this.isRunning) return;

    // 找出需要最早检查的数据源
    let nextCheckTime = Infinity;
    let sourceToCheck: string | null = null;

    for (const [source, state] of this.checkStates) {
      if (state.nextCheck < nextCheckTime) {
        nextCheckTime = state.nextCheck;
        sourceToCheck = source;
      }
    }

    if (sourceToCheck && nextCheckTime !== Infinity) {
      const delay = Math.max(0, nextCheckTime - Date.now());

      this.checkTimer = setTimeout(() => {
        this.runHealthCheck(sourceToCheck!);
        this.scheduleNextCheck(); // 递归安排下一次检查
      }, delay);

      logger.debug(`下次检查: ${sourceToCheck} in ${Math.round(delay / 1000)}s`);
    }
  }

  /**
   * 执行健康检查
   */
  private async runHealthCheck(source: string): Promise<void> {
    const state = this.checkStates.get(source);
    if (!state) return;

    logger.info(`执行健康检查: ${source}`);

    try {
      // 获取最新指标
      let metrics = telemetryCollector.getSourceMetrics(source);

      // 如果数据源从未被请求过，创建默认指标
      if (!metrics) {
        metrics = {
          source,
          successRate: 1.0, // 默认健康
          avgResponseTime: 0,
          errorCount: 0,
          rateLimitHits: 0,
          totalRequests: 0,
          successRequests: 0,
          lastUpdated: Date.now(),
        };
      }

      // 判定健康状态
      const healthStatus = this.evaluateHealthStatus(metrics);

      // 更新状态
      const previousStatus = state.status;
      state.status = healthStatus;
      state.lastCheck = Date.now();

      // 更新连续计数
      if (healthStatus === 'healthy') {
        state.consecutiveSuccesses++;
        state.consecutiveFails = 0;
      } else {
        state.consecutiveFails++;
        state.consecutiveSuccesses = 0;
      }

      // 计算下次检查时间
      state.nextCheck = Date.now() + this.getCheckInterval(healthStatus);

      // 状态变化时触发告警
      if (previousStatus !== healthStatus) {
        logger.info(`${source} 健康状态变化: ${previousStatus} -> ${healthStatus}`);
        await this.handleStatusChange(source, healthStatus, previousStatus);
      }

      // 记录监控日志
      await MonitoringLogQueries.createLog({
        source,
        timestamp: new Date(),
        healthStatus,
        metrics,
        triggeredAlerts: [], // 由 alertManager 填充
      });

      // 评估告警（每次检查都评估）
      const triggeredAlerts = await alertManager.evaluateAndAlert(metrics);
      if (triggeredAlerts.length > 0) {
        logger.info(`${source} 触发 ${triggeredAlerts.length} 个告警`);
      }

    } catch (error) {
      logger.error(`健康检查失败: ${source}`, error);
      state.consecutiveFails++;
      state.status = 'critical';
      state.nextCheck = Date.now() + this.config.criticalInterval;
    }
  }

  /**
   * 判定健康状态
   */
  private evaluateHealthStatus(metrics: TelemetryMetrics): HealthStatus {
    const { critical, degraded, healthy } = HEALTH_THRESHOLDS;

    // 检查危急状态
    if (
      metrics.successRate <= critical.maxSuccessRate ||
      metrics.errorCount >= critical.minErrorCount ||
      metrics.avgResponseTime >= critical.maxResponseTime
    ) {
      return 'critical';
    }

    // 检查降级状态
    if (
      metrics.successRate <= degraded.maxSuccessRate ||
      metrics.errorCount >= degraded.minErrorCount ||
      metrics.avgResponseTime >= degraded.maxResponseTime
    ) {
      return 'degraded';
    }

    // 检查健康状态
    if (
      metrics.successRate >= healthy.minSuccessRate &&
      metrics.errorCount <= healthy.maxErrorCount &&
      metrics.avgResponseTime <= healthy.maxResponseTime
    ) {
      return 'healthy';
    }

    // 默认返回降级状态
    return 'degraded';
  }

  /**
   * 根据健康状态获取检查间隔
   */
  private getCheckInterval(status: HealthStatus): number {
    switch (status) {
      case 'healthy':
        return this.config.healthyInterval;
      case 'degraded':
        return this.config.degradedInterval;
      case 'critical':
        return this.config.criticalInterval;
    }
  }

  /**
   * 处理状态变化
   */
  private async handleStatusChange(
    source: string,
    newStatus: HealthStatus,
    previousStatus: HealthStatus
  ): Promise<void> {
    // 恢复到健康状态时，解决该数据源的活跃告警
    if (newStatus === 'healthy' && previousStatus !== 'healthy') {
      const resolved = alertManager.resolveSourceAlerts(source);
      if (resolved > 0) {
        logger.info(`${source} 恢复健康，已解决 ${resolved} 个告警`);
      }
    }
  }

  /**
   * 手动触发健康检查
   */
  async checkNow(source: string): Promise<SourceHealthStatus> {
    const state = this.checkStates.get(source);
    if (!state) {
      throw new Error(`未知的数据源: ${source}`);
    }

    await this.runHealthCheck(source);

    return this.getHealthStatus(source);
  }

  /**
   * 获取数据源健康状态
   */
  getHealthStatus(source: string): SourceHealthStatus {
    const state = this.checkStates.get(source);
    if (!state) {
      throw new Error(`未知的数据源: ${source}`);
    }

    let metrics = telemetryCollector.getSourceMetrics(source);

    // 如果数据源从未被请求过，创建默认指标
    if (!metrics) {
      metrics = {
        source,
        successRate: 1.0,
        avgResponseTime: 0,
        errorCount: 0,
        rateLimitHits: 0,
        totalRequests: 0,
        successRequests: 0,
        lastUpdated: Date.now(),
      };
    }

    // 计算健康评分 (0-100)
    const score = this.calculateHealthScore(metrics);

    // 收集问题
    const issues: string[] = [];
    if (metrics.successRate < 0.5) {
      issues.push(`成功率过低: ${(metrics.successRate * 100).toFixed(1)}%`);
    }
    if (metrics.avgResponseTime > 2000) {
      issues.push(`响应时间过长: ${metrics.avgResponseTime.toFixed(0)}ms`);
    }
    if (metrics.errorCount > 5) {
      issues.push(`错误计数偏高: ${metrics.errorCount}`);
    }

    return {
      source,
      status: state.status,
      enabled: true,
      isPrimary: true, // TODO: 从配置读取
      lastChecked: state.lastCheck,
      score,
      issues,
    };
  }

  /**
   * 获取所有数据源健康状态
   */
  getAllHealthStatus(): SourceHealthStatus[] {
    const statuses: SourceHealthStatus[] = [];

    for (const source of this.sources) {
      try {
        statuses.push(this.getHealthStatus(source));
      } catch (error) {
        logger.error(`获取健康状态失败: ${source}`, error);
      }
    }

    return statuses;
  }

  /**
   * 计算健康评分
   */
  private calculateHealthScore(metrics: TelemetryMetrics): number {
    let score = 100;

    // 成功率影响
    score -= (1 - metrics.successRate) * 50;

    // 响应时间影响
    if (metrics.avgResponseTime > 1000) {
      score -= Math.min(30, (metrics.avgResponseTime - 1000) / 100);
    }

    // 错误计数影响
    score -= Math.min(20, metrics.errorCount * 2);

    return Math.max(0, Math.round(score));
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AdaptiveCheckConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
    logger.info('更新健康检查配置:', this.config);
  }

  /**
   * 获取配置
   */
  getConfig(): AdaptiveCheckConfig {
    return { ...this.config };
  }

  /**
   * 是否正在运行
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * 获取检查状态
   */
  getCheckStates(): Map<string, SourceCheckState> {
    return new Map(this.checkStates);
  }
}

// 导出默认实例
export const adaptiveHealthChecker = new AdaptiveHealthChecker();
