/**
 * 告警规则引擎
 *
 * 定义和评估告警规则
 * @module data-sources/alerting/rules-engine
 */

import type { AlertRule, TelemetryMetrics } from './types';

/**
 * 预定义的告警规则
 *
 * 规则优先级：Critical > Warning > Info
 * 同级别规则按定义顺序评估
 */
export const ALERT_RULES: AlertRule[] = [
  // ==================== Critical 级别 ====================
  {
    id: 'source-down',
    name: '数据源完全不可用',
    level: 'critical',
    condition: (metrics: TelemetryMetrics) => {
      // 成功率低于 50%
      return metrics.successRate < 0.5;
    },
    message: (metrics: TelemetryMetrics) => {
      const rate = (metrics.successRate * 100).toFixed(1);
      return `【严重】${metrics.source} 数据源成功率降至 ${rate}%，低于健康阈值 50%`;
    },
    channels: ['email', 'toast'],
    enabled: true,
  },
  {
    id: 'consecutive-failures',
    name: '连续失败次数过高',
    level: 'critical',
    condition: (metrics: TelemetryMetrics) => {
      // 总请求 > 20 且成功率过低时检查错误计数
      const totalRequests = metrics.successRequests + metrics.errorCount;
      return totalRequests > 20 && metrics.errorCount > 10;
    },
    message: (metrics: TelemetryMetrics) => {
      return `【严重】${metrics.source} 累计错误 ${metrics.errorCount} 次，可能存在服务异常`;
    },
    channels: ['email', 'toast'],
    enabled: true,
  },
  {
    id: 'all-sources-down',
    name: '所有数据源不可用',
    level: 'critical',
    condition: (metrics: TelemetryMetrics) => {
      // 当单个数据源完全无响应时（成功率 = 0 且有请求记录）
      return metrics.successRate === 0 && metrics.totalRequests > 5;
    },
    message: (metrics: TelemetryMetrics) => {
      return `【危急】${metrics.source} 完全不可用，所有请求均失败！`;
    },
    channels: ['email', 'toast'],
    enabled: true,
  },
  {
    id: 'extreme-slow-response',
    name: '响应时间极长',
    level: 'critical',
    condition: (metrics: TelemetryMetrics) => {
      // 响应时间超过 10 秒
      return metrics.avgResponseTime > 10000;
    },
    message: (metrics: TelemetryMetrics) => {
      const seconds = (metrics.avgResponseTime / 1000).toFixed(1);
      return `【严重】${metrics.source} 平均响应时间达 ${seconds} 秒，远超正常水平`;
    },
    channels: ['email', 'toast'],
    enabled: true,
  },

  // ==================== Warning 级别 ====================
  {
    id: 'degraded-performance',
    name: '性能下降',
    level: 'warning',
    condition: (metrics: TelemetryMetrics) => {
      // 成功率在 50%-80% 之间
      return metrics.successRate >= 0.5 && metrics.successRate < 0.8;
    },
    message: (metrics: TelemetryMetrics) => {
      const rate = (metrics.successRate * 100).toFixed(1);
      return `【警告】${metrics.source} 成功率为 ${rate}%，低于正常水平`;
    },
    channels: ['toast'],
    enabled: true,
  },
  {
    id: 'slow-response',
    name: '响应时间过长',
    level: 'warning',
    condition: (metrics: TelemetryMetrics) => {
      // 响应时间超过 2 秒但低于 10 秒
      return metrics.avgResponseTime > 2000 && metrics.avgResponseTime <= 10000;
    },
    message: (metrics: TelemetryMetrics) => {
      const ms = metrics.avgResponseTime.toFixed(0);
      return `【警告】${metrics.source} 平均响应时间 ${ms}ms，高于正常水平`;
    },
    channels: ['toast'],
    enabled: true,
  },
  {
    id: 'single-source-failure',
    name: '单源故障（有备用）',
    level: 'warning',
    condition: (metrics: TelemetryMetrics) => {
      // 有一定失败率，但不是完全不可用
      const totalRequests = metrics.successRequests + metrics.errorCount;
      return totalRequests > 10 && metrics.errorCount > 3 && metrics.successRate > 0.3;
    },
    message: (metrics: TelemetryMetrics) => {
      return `【警告】${metrics.source} 出现间歇性故障，已启用备用数据源`;
    },
    channels: ['toast'],
    enabled: true,
  },
  {
    id: 'high-error-count',
    name: '错误计数偏高',
    level: 'warning',
    condition: (metrics: TelemetryMetrics) => {
      // 错误次数超过 5 次
      return metrics.errorCount >= 5 && metrics.errorCount <= 10;
    },
    message: (metrics: TelemetryMetrics) => {
      return `【警告】${metrics.source} 累计 ${metrics.errorCount} 次错误，请关注服务状态`;
    },
    channels: ['toast'],
    enabled: true,
  },

  // ==================== Info 级别 ====================
  {
    id: 'first-failure',
    name: '首次失败',
    level: 'info',
    condition: (metrics: TelemetryMetrics) => {
      // 刚开始出现第一次失败
      return metrics.errorCount === 1 && metrics.totalRequests > 1;
    },
    message: (metrics: TelemetryMetrics) => {
      return `【注意】${metrics.source} 首次请求失败，可能为偶发错误`;
    },
    channels: ['toast'],
    enabled: true,
  },
  {
    id: 'rate-limit-hit',
    name: 'API 速率限制',
    level: 'info',
    condition: (metrics: TelemetryMetrics) => {
      // 触发速率限制
      return metrics.rateLimitHits > 0;
    },
    message: (metrics: TelemetryMetrics) => {
      const times = metrics.rateLimitHits === 1 ? '次' : '次';
      return `【信息】${metrics.source} 触发 API 速率限制 ${metrics.rateLimitHits}${times}，已自动重试`;
    },
    channels: ['toast'],
    enabled: true,
  },
  {
    id: 'data-fusion-activated',
    name: '数据融合激活',
    level: 'info',
    condition: (metrics: TelemetryMetrics) => {
      // 这里需要从聚合指标判断，暂时用成功率高但请求较多表示
      return metrics.successRequests > 10 && metrics.successRate > 0.95;
    },
    message: (metrics: TelemetryMetrics) => {
      return `【信息】${metrics.source} 运行正常，多数据源融合已激活`;
    },
    channels: ['toast'],
    enabled: true,
  },
  {
    id: 'cache-hit-anomaly',
    name: '缓存命中率异常',
    level: 'info',
    condition: (metrics: TelemetryMetrics) => {
      // 这里需要从缓存指标判断，暂时用低响应时间表示高缓存命中
      return metrics.avgResponseTime < 100 && metrics.totalRequests > 10;
    },
    message: (metrics: TelemetryMetrics) => {
      return `【信息】${metrics.source} 缓存命中率较高，响应快速`;
    },
    channels: ['toast'],
    enabled: true,
  },
];

/**
 * 告警规则引擎类
 */
export class AlertRulesEngine {
  private rules: AlertRule[];

  constructor(customRules?: AlertRule[]) {
    this.rules = customRules || ALERT_RULES;
  }

  /**
   * 评估所有启用的规则
   */
  evaluate(metrics: TelemetryMetrics): AlertRule[] {
    return this.rules.filter(rule => {
      // 只评估启用的规则
      if (rule.enabled === false) return false;
      // 检查触发条件
      return rule.condition(metrics);
    });
  }

  /**
   * 按级别评估规则
   */
  evaluateByLevel(metrics: TelemetryMetrics, level: 'critical' | 'warning' | 'info'): AlertRule[] {
    return this.evaluate(metrics).filter(rule => rule.level === level);
  }

  /**
   * 获取所有规则
   */
  getAllRules(): AlertRule[] {
    return [...this.rules];
  }

  /**
   * 根据ID获取规则
   */
  getRuleById(id: string): AlertRule | undefined {
    return this.rules.find(rule => rule.id === id);
  }

  /**
   * 添加自定义规则
   */
  addRule(rule: AlertRule): void {
    // 检查是否已存在
    const existingIndex = this.rules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      this.rules[existingIndex] = rule;
    } else {
      this.rules.push(rule);
    }
  }

  /**
   * 禁用/启用规则
   */
  toggleRule(ruleId: string, enabled: boolean): boolean {
    const rule = this.getRuleById(ruleId);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * 获取优先级排序的规则
   * Critical > Warning > Info
   */
  getRulesByPriority(): AlertRule[] {
    const priority = { critical: 3, warning: 2, info: 1 };
    return [...this.rules].sort((a, b) => priority[b.level] - priority[a.level]);
  }
}

// 导出默认实例
export const alertRulesEngine = new AlertRulesEngine();
