/**
 * 自动故障转移服务
 *
 * 管理数据源的自动降级和恢复
 * @module data-sources/alerting/failover
 */

import type { FailoverConfig, HealthStatus, SourceFailoverState } from './types';
import { adaptiveHealthChecker } from './health-checker';
import { alertManager } from './alert-manager';
import { logger } from '../logger';

/**
 * 默认故障转移配置
 */
const DEFAULT_FAILOVER_CONFIG: FailoverConfig = {
  failureThreshold: 10, // 连续失败 10 次
  successRateThreshold: 0.3, // 成功率低于 30%
  recoveryCheckInterval: 15 * 60 * 1000, // 15分钟尝试恢复一次
  recoverySuccessCount: 3, // 连续成功 3 次才恢复
};

/**
 * 数据源故障转移状态
 */
interface FailoverState {
  source: string;
  isEnabled: boolean; // 是否启用（未降级）
  isPrimary: boolean; // 是否为主数据源
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailure?: number;
  lastRecovery?: number;
  nextRecoveryCheck?: number;
  recoveryAttempts: number;
}

/**
 * 故障转移事件
 */
export interface FailoverEvent {
  type: 'degraded' | 'recovered';
  source: string;
  timestamp: number;
  reason: string;
}

/**
 * 自动故障转移管理器
 */
export class FailoverManager {
  private config: FailoverConfig;
  private states: Map<string, FailoverState>;
  private eventHistory: FailoverEvent[] = [];
  private recoveryTimer: NodeJS.Timeout | null = null;
  private onFailoverCallback?: (event: FailoverEvent) => void;

  constructor(config?: Partial<FailoverConfig>) {
    this.config = {
      ...DEFAULT_FAILOVER_CONFIG,
      ...config,
    };
    this.states = new Map();
  }

  /**
   * 初始化数据源状态
   */
  initializeSource(source: string, isPrimary: boolean = true): void {
    if (!this.states.has(source)) {
      this.states.set(source, {
        source,
        isEnabled: true,
        isPrimary,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        recoveryAttempts: 0,
      });
      logger.info(`初始化故障转移状态: ${source} (主数据源: ${isPrimary})`);
    }
  }

  /**
   * 评估是否需要故障转移
   */
  async evaluateFailover(source: string): Promise<FailoverEvent | null> {
    const state = this.states.get(source);
    if (!state) {
      logger.warn(`未知的数据源: ${source}`);
      return null;
    }

    const healthStatus = adaptiveHealthChecker.getHealthStatus(source);

    // 检查是否需要降级
    if (state.isEnabled && this.shouldDegrade(healthStatus, state)) {
      return await this.degradeSource(source, healthStatus);
    }

    // 检查是否需要恢复
    if (!state.isEnabled && this.shouldRecover(healthStatus, state)) {
      return await this.recoverSource(source, healthStatus);
    }

    return null;
  }

  /**
   * 判断是否应该降级
   */
  private shouldDegrade(
    healthStatus: { status: HealthStatus; score: number },
    state: FailoverState
  ): boolean {
    // 已达到降级条件
    if (
      healthStatus.status === 'critical' ||
      healthStatus.score < 50 ||
      state.consecutiveFailures >= this.config.failureThreshold
    ) {
      return true;
    }
    return false;
  }

  /**
   * 判断是否应该恢复
   */
  private shouldRecover(
    healthStatus: { status: HealthStatus; score: number },
    state: FailoverState
  ): boolean {
    // 达到恢复条件
    if (
      healthStatus.status === 'healthy' &&
      healthStatus.score >= 80 &&
      state.consecutiveSuccesses >= this.config.recoverySuccessCount
    ) {
      return true;
    }
    return false;
  }

  /**
   * 降级数据源
   */
  private async degradeSource(
    source: string,
    healthStatus: { status: HealthStatus; score: number }
  ): Promise<FailoverEvent> {
    const state = this.states.get(source)!;

    state.isEnabled = false;
    state.lastFailure = Date.now();
    state.consecutiveFailures = 0;

    const reason = `健康状态: ${healthStatus.status}, 评分: ${healthStatus.score}`;
    const event: FailoverEvent = {
      type: 'degraded',
      source,
      timestamp: Date.now(),
      reason,
    };

    this.eventHistory.push(event);
    logger.warn(`数据源已降级: ${source} - ${reason}`);

    // 触发回调
    if (this.onFailoverCallback) {
      this.onFailoverCallback(event);
    }

    // 安排恢复检查
    this.scheduleRecoveryCheck(source);

    return event;
  }

  /**
   * 恢复数据源
   */
  private async recoverSource(
    source: string,
    healthStatus: { status: HealthStatus; score: number }
  ): Promise<FailoverEvent> {
    const state = this.states.get(source)!;

    state.isEnabled = true;
    state.lastRecovery = Date.now();
    state.consecutiveSuccesses = 0;
    state.recoveryAttempts = 0;

    const reason = `健康状态: ${healthStatus.status}, 评分: ${healthStatus.score}`;
    const event: FailoverEvent = {
      type: 'recovered',
      source,
      timestamp: Date.now(),
      reason,
    };

    this.eventHistory.push(event);
    logger.info(`数据源已恢复: ${source} - ${reason}`);

    // 触发回调
    if (this.onFailoverCallback) {
      this.onFailoverCallback(event);
    }

    // 解决相关告警
    alertManager.resolveSourceAlerts(source);

    return event;
  }

  /**
   * 安排恢复检查
   */
  private scheduleRecoveryCheck(source: string): void {
    const state = this.states.get(source);
    if (!state) return;

    state.nextRecoveryCheck = Date.now() + this.config.recoveryCheckInterval;

    // 清除已有的恢复定时器
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    // 安排下一次恢复检查
    this.scheduleNextRecoveryCheck();
  }

  /**
   * 安排下一次恢复检查
   */
  private scheduleNextRecoveryCheck(): void {
    // 找出最早需要检查的数据源
    let nextCheckTime = Infinity;
    let sourceToCheck: string | null = null;

    for (const [source, state] of this.states) {
      if (!state.isEnabled && state.nextRecoveryCheck && state.nextRecoveryCheck < nextCheckTime) {
        nextCheckTime = state.nextRecoveryCheck!;
        sourceToCheck = source;
      }
    }

    if (sourceToCheck && nextCheckTime !== Infinity) {
      const delay = Math.max(0, nextCheckTime - Date.now());

      this.recoveryTimer = setTimeout(async () => {
        await this.performRecoveryCheck(sourceToCheck!);
        this.scheduleNextRecoveryCheck(); // 递归安排
      }, delay);

      logger.debug(`下次恢复检查: ${sourceToCheck} in ${Math.round(delay / 1000)}s`);
    }
  }

  /**
   * 执行恢复检查
   */
  private async performRecoveryCheck(source: string): Promise<void> {
    const state = this.states.get(source);
    if (!state || state.isEnabled) return;

    logger.info(`执行恢复检查: ${source}`);

    try {
      // 触发健康检查
      const healthStatus = await adaptiveHealthChecker.checkNow(source);

      // 检查是否满足恢复条件
      if (healthStatus.status === 'healthy' && healthStatus.score >= 80) {
        state.consecutiveSuccesses++;
        logger.info(`${source} 恢复检查成功 (${state.consecutiveSuccesses}/${this.config.recoverySuccessCount})`);

        // 达到恢复条件
        if (state.consecutiveSuccesses >= this.config.recoverySuccessCount) {
          await this.recoverSource(source, healthStatus);
        } else {
          // 继续等待
          this.scheduleRecoveryCheck(source);
        }
      } else {
        // 恢复失败，重置计数
        state.consecutiveSuccesses = 0;
        state.recoveryAttempts++;
        logger.warn(`${source} 恢复检查未通过，等待下次检查`);
        this.scheduleRecoveryCheck(source);
      }
    } catch (error) {
      logger.error(`恢复检查失败: ${source}`, error);
      state.consecutiveSuccesses = 0;
      this.scheduleRecoveryCheck(source);
    }
  }

  /**
   * 记录请求失败
   */
  recordFailure(source: string): void {
    const state = this.states.get(source);
    if (state) {
      state.consecutiveFailures++;
      state.consecutiveSuccesses = 0;
    }
  }

  /**
   * 记录请求成功
   */
  recordSuccess(source: string): void {
    const state = this.states.get(source);
    if (state) {
      state.consecutiveSuccesses++;
      if (state.consecutiveFailures > 0) {
        state.consecutiveFailures--;
      }
    }
  }

  /**
   * 获取数据源状态
   */
  getSourceState(source: string): SourceFailoverState | undefined {
    const state = this.states.get(source);
    if (!state) return undefined;

    return {
      source: state.source,
      enabled: state.isEnabled,
      isPrimary: state.isPrimary,
      lastFailure: state.lastFailure,
      lastRecovery: state.lastRecovery,
      consecutiveFailures: state.consecutiveFailures,
      consecutiveSuccesses: state.consecutiveSuccesses,
    };
  }

  /**
   * 获取所有数据源状态
   */
  getAllStates(): SourceFailoverState[] {
    return Array.from(this.states.values()).map(state => ({
      source: state.source,
      enabled: state.isEnabled,
      isPrimary: state.isPrimary,
      lastFailure: state.lastFailure,
      lastRecovery: state.lastRecovery,
      consecutiveFailures: state.consecutiveFailures,
      consecutiveSuccesses: state.consecutiveSuccesses,
    }));
  }

  /**
   * 获取事件历史
   */
  getEventHistory(limit?: number): FailoverEvent[] {
    const history = [...this.eventHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * 手动切换数据源状态
   */
  async toggleSource(source: string, enabled: boolean): Promise<boolean> {
    const state = this.states.get(source);
    if (!state) {
      logger.warn(`未知的数据源: ${source}`);
      return false;
    }

    const previousEnabled = state.isEnabled;
    state.isEnabled = enabled;

    if (previousEnabled !== enabled) {
      const event: FailoverEvent = {
        type: enabled ? 'recovered' : 'degraded',
        source,
        timestamp: Date.now(),
        reason: '手动切换',
      };
      this.eventHistory.push(event);

      if (enabled) {
        logger.info(`手动启用数据源: ${source}`);
        alertManager.resolveSourceAlerts(source);
      } else {
        logger.warn(`手动禁用数据源: ${source}`);
      }

      if (this.onFailoverCallback) {
        this.onFailoverCallback(event);
      }
    }

    return true;
  }

  /**
   * 设置故障转移回调
   */
  onFailover(callback: (event: FailoverEvent) => void): void {
    this.onFailoverCallback = callback;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<FailoverConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
    logger.info('更新故障转移配置:', this.config);
  }

  /**
   * 获取配置
   */
  getConfig(): FailoverConfig {
    return { ...this.config };
  }

  /**
   * 停止所有恢复检查
   */
  stop(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }
}

// 导出默认实例
export const failoverManager = new FailoverManager();
