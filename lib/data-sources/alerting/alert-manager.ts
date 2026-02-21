/**
 * 告警管理器
 *
 * 管理告警的评估、抑制和通知
 * 支持分层抑制策略
 * @module data-sources/alerting/alert-manager
 */

import type {
  Alert,
  AlertLevel,
  AlertRule,
  AlertStatus,
  SuppressionConfig,
  TelemetryMetrics,
} from './types';

// 生成唯一 ID
function generateId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
import { alertRulesEngine } from './rules-engine';
import { alertNotifier } from './notifier';
import { logger } from '../logger';

/**
 * 默认抑制配置（用户选择：分层抑制策略）
 * - Critical: 不抑制（立即发送）
 * - Warning: 10分钟
 * - Info: 30分钟
 */
const DEFAULT_SUPPRESSION_CONFIG: SuppressionConfig = {
  critical: 0, // 不抑制
  warning: 10 * 60 * 1000, // 10分钟
  info: 30 * 60 * 1000, // 30分钟
};

/**
 * 抑制记录
 */
interface SuppressionRecord {
  key: string;
  until: number;
  alertCount: number;
}

/**
 * 告警管理器
 */
export class AlertManager {
  private suppressionConfig: SuppressionConfig;
  private suppressionWindow: Map<string, SuppressionRecord>;
  private activeAlerts: Map<string, Alert>;
  private alertHistory: Alert[];

  constructor(suppressionConfig?: Partial<SuppressionConfig>) {
    this.suppressionConfig = {
      ...DEFAULT_SUPPRESSION_CONFIG,
      ...suppressionConfig,
    };
    this.suppressionWindow = new Map();
    this.activeAlerts = new Map();
    this.alertHistory = [];
  }

  /**
   * 评估并触发告警
   */
  async evaluateAndAlert(metrics: TelemetryMetrics): Promise<Alert[]> {
    const triggeredRules = alertRulesEngine.evaluate(metrics);
    const triggeredAlerts: Alert[] = [];

    for (const rule of triggeredRules) {
      const alert = await this.createAlert(metrics, rule);
      if (alert) {
        triggeredAlerts.push(alert);
      }
    }

    // 持久化告警历史
    if (triggeredAlerts.length > 0) {
      this.alertHistory.push(...triggeredAlerts);
    }

    return triggeredAlerts;
  }

  /**
   * 创建告警（应用抑制策略）
   */
  private async createAlert(
    metrics: TelemetryMetrics,
    rule: AlertRule,
  ): Promise<Alert | null> {
    const suppressionKey = this.getSuppressionKey(metrics.source, rule.id);
    const suppressed = this.isSuppressed(suppressionKey, rule.level);

    // 检查抑制状态
    if (suppressed) {
      logger.debug(`告警已被抑制: ${rule.name} (${metrics.source})`);
      this.incrementSuppressionCount(suppressionKey);
      return null;
    }

    // 创建告警对象
    const alert: Alert = {
      id: generateId(),
      source: metrics.source,
      ruleId: rule.id,
      level: rule.level,
      title: rule.name,
      message: rule.message(metrics),
      metrics: { ...metrics },
      channels: rule.channels,
      status: 'active',
      createdAt: Date.now(),
      notified: { email: false, toast: false },
    };

    // 应用抑制（Critical 不抑制）
    this.applySuppression(suppressionKey, rule.level);

    // 记录活跃告警
    this.activeAlerts.set(alert.id, alert);

    // 发送通知
    await alertNotifier.sendAlert(alert);

    logger.info(`触发告警: [${alert.level.toUpperCase()}] ${alert.title} - ${alert.message}`);

    return alert;
  }

  /**
   * 生成抑制键
   */
  private getSuppressionKey(source: string, ruleId: string): string {
    return `${source}:${ruleId}`;
  }

  /**
   * 检查是否被抑制
   */
  private isSuppressed(key: string, level: AlertLevel): boolean {
    const record = this.suppressionWindow.get(key);
    if (!record) return false;

    const now = Date.now();
    if (now > record.until) {
      // 抑制窗口已过期
      this.suppressionWindow.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 应用抑制
   */
  private applySuppression(key: string, level: AlertLevel): void {
    const duration = this.suppressionConfig[level];

    // Critical 级别不抑制
    if (duration === 0) {
      logger.debug(`Critical 级别不抑制: ${key}`);
      return;
    }

    const until = Date.now() + duration;
    this.suppressionWindow.set(key, {
      key,
      until,
      alertCount: 1,
    });

    logger.debug(`应用抑制: ${key} -> ${duration}ms`);
  }

  /**
   * 增加抑制计数
   */
  private incrementSuppressionCount(key: string): void {
    const record = this.suppressionWindow.get(key);
    if (record) {
      record.alertCount++;
    }
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && alert.status === 'active') {
      alert.status = 'resolved';
      alert.resolvedAt = Date.now();
      this.activeAlerts.delete(alertId);
      logger.info(`解决告警: ${alert.title}`);
      return true;
    }
    return false;
  }

  /**
   * 解决数据源的所有告警
   */
  resolveSourceAlerts(source: string): number {
    let resolved = 0;
    for (const [id, alert] of this.activeAlerts) {
      if (alert.source === source && alert.status === 'active') {
        this.resolveAlert(id);
        resolved++;
      }
    }
    return resolved;
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 获取数据源的活跃告警
   */
  getSourceAlerts(source: string): Alert[] {
    return this.getActiveAlerts().filter(alert => alert.source === source);
  }

  /**
   * 获取指定级别的活跃告警
   */
  getAlertsByLevel(level: AlertLevel): Alert[] {
    return this.getActiveAlerts().filter(alert => alert.level === level);
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(limit?: number): Alert[] {
    const history = [...this.alertHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * 清理过期的抑制记录
   */
  cleanupSuppressions(): void {
    const now = Date.now();
    for (const [key, record] of this.suppressionWindow) {
      if (now > record.until) {
        this.suppressionWindow.delete(key);
      }
    }
  }

  /**
   * 获取抑制状态（用于调试）
   */
  getSuppressionStatus(): Array<{ key: string; remaining: number; count: number }> {
    const now = Date.now();
    return Array.from(this.suppressionWindow.values())
      .filter(record => record.until > now)
      .map(record => ({
        key: record.key,
        remaining: Math.max(0, record.until - now),
        count: record.alertCount,
      }));
  }

  /**
   * 更新抑制配置
   */
  updateSuppressionConfig(config: Partial<SuppressionConfig>): void {
    this.suppressionConfig = {
      ...this.suppressionConfig,
      ...config,
    };
    logger.info('更新抑制配置:', this.suppressionConfig);
  }

  /**
   * 获取当前抑制配置
   */
  getSuppressionConfig(): SuppressionConfig {
    return { ...this.suppressionConfig };
  }

  /**
   * 清除所有抑制
   */
  clearSuppressions(): void {
    this.suppressionWindow.clear();
    logger.info('清除所有抑制记录');
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    activeAlerts: number;
    suppressedAlerts: number;
    totalHistory: number;
    byLevel: Record<AlertLevel, number>;
  } {
    const activeAlerts = this.getActiveAlerts();
    const suppressedCount = this.suppressionWindow.size;

    const byLevel: Record<AlertLevel, number> = {
      critical: 0,
      warning: 0,
      info: 0,
    };

    for (const alert of activeAlerts) {
      byLevel[alert.level]++;
    }

    return {
      activeAlerts: activeAlerts.length,
      suppressedAlerts: suppressedCount,
      totalHistory: this.alertHistory.length,
      byLevel,
    };
  }
}

// 导出默认实例
export const alertManager = new AlertManager();
