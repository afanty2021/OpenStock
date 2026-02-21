/**
 * 告警系统 - 类型定义
 *
 * 定义告警系统的核心类型和接口
 * @module data-sources/alerting/types
 */

import type { TelemetryMetrics } from '../monitoring';

/**
 * 告警级别
 */
export type AlertLevel = 'critical' | 'warning' | 'info';

/**
 * 通知渠道
 */
export type NotificationChannel = 'email' | 'toast';

/**
 * 告警状态
 */
export type AlertStatus = 'active' | 'resolved' | 'suppressed';

/**
 * 告警规则接口
 */
export interface AlertRule {
  /** 规则唯一标识 */
  id: string;
  /** 规则名称 */
  name: string;
  /** 告警级别 */
  level: AlertLevel;
  /** 触发条件函数 */
  condition: (metrics: TelemetryMetrics) => boolean;
  /** 告警消息生成函数 */
  message: (metrics: TelemetryMetrics) => string;
  /** 通知渠道 */
  channels: NotificationChannel[];
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 告警对象
 */
export interface Alert {
  /** 告警唯一标识 */
  id: string;
  /** 数据源名称 */
  source: string;
  /** 规则 ID */
  ruleId: string;
  /** 告警级别 */
  level: AlertLevel;
  /** 告警标题 */
  title: string;
  /** 告警消息 */
  message: string;
  /** 触发时的指标 */
  metrics: TelemetryMetrics;
  /** 通知渠道 */
  channels: NotificationChannel[];
  /** 告警状态 */
  status: AlertStatus;
  /** 创建时间 */
  createdAt: number;
  /** 解决时间 */
  resolvedAt?: number;
  /** 通知状态 */
  notified: {
    email: boolean;
    toast: boolean;
  };
}

/**
 * 告警抑制配置
 */
export interface SuppressionConfig {
  /** Critical 级别抑制时间（毫秒），0 表示不抑制 */
  critical: number;
  /** Warning 级别抑制时间（毫秒） */
  warning: number;
  /** Info 级别抑制时间（毫秒） */
  info: number;
}

/**
 * 健康检查状态
 */
export type HealthStatus = 'healthy' | 'degraded' | 'critical';

/**
 * 智能自适应检查配置
 */
export interface AdaptiveCheckConfig {
  /** 健康状态检查间隔（毫秒） */
  healthyInterval: number;
  /** 降级状态检查间隔（毫秒） */
  degradedInterval: number;
  /** 危急状态检查间隔（毫秒） */
  criticalInterval: number;
}

/**
 * 故障转移配置
 */
export interface FailoverConfig {
  /** 自动降级阈值：连续失败次数 */
  failureThreshold: number;
  /** 自动降级阈值：成功率低于此值 */
  successRateThreshold: number;
  /** 恢复尝试间隔（毫秒） */
  recoveryCheckInterval: number;
  /** 恢复成功所需的连续成功次数 */
  recoverySuccessCount: number;
}

/**
 * 数据源健康状态
 */
export interface SourceHealthStatus {
  /** 数据源名称 */
  source: string;
  /** 健康状态 */
  status: HealthStatus;
  /** 当前是否启用 */
  enabled: boolean;
  /** 是否为主数据源 */
  isPrimary: boolean;
  /** 最后检查时间 */
  lastChecked: number;
  /** 健康评分 (0-100) */
  score: number;
  /** 问题列表 */
  issues: string[];
}

/**
 * 通知服务接口
 */
export interface INotificationService {
  /** 发送邮件通知 */
  sendEmail(params: EmailParams): Promise<void>;
  /** 发送 Toast 通知 */
  showToast(params: ToastParams): void;
}

/**
 * 邮件参数
 */
export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Toast 参数
 */
export interface ToastParams {
  message: string;
  level: AlertLevel;
  duration?: number;
}

/**
 * 告警历史记录
 */
export interface AlertHistoryRecord {
  _id?: string;
  source: string;
  level: AlertLevel;
  ruleId: string;
  title: string;
  message: string;
  metrics: {
    successRate: number;
    avgResponseTime: number;
    errorCount: number;
    rateLimitHits: number;
  };
  channels: NotificationChannel[];
  status: AlertStatus;
  notified: {
    email: boolean;
    toast: boolean;
  };
  resolvedAt?: Date;
  createdAt: Date;
}

/**
 * 监控日志记录
 */
export interface MonitoringLogRecord {
  _id?: string;
  source: string;
  timestamp: Date;
  healthStatus: HealthStatus;
  metrics: TelemetryMetrics;
  triggeredAlerts: string[]; // alert IDs
}

/**
 * 数据源故障转移状态
 */
export interface SourceFailoverState {
  source: string;
  enabled: boolean;
  isPrimary: boolean;
  lastFailure?: number;
  lastRecovery?: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}
