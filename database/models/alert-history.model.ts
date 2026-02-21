/**
 * 告警历史数据模型
 *
 * 存储告警历史记录，支持查询和统计
 * @module database/models/alert-history
 */

import mongoose, { Schema, Model } from 'mongoose';
import type { AlertHistoryRecord, MonitoringLogRecord } from '../../lib/data-sources/alerting/types';

/**
 * 告警历史 Schema
 */
const alertHistorySchema = new Schema<AlertHistoryRecord>({
  source: {
    type: String,
    required: true,
    index: true,
  },
  level: {
    type: String,
    enum: ['critical', 'warning', 'info'],
    required: true,
    index: true,
  },
  ruleId: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  metrics: {
    successRate: { type: Number, required: true },
    avgResponseTime: { type: Number, required: true },
    errorCount: { type: Number, required: true },
    rateLimitHits: { type: Number, default: 0 },
  },
  channels: {
    type: [String],
    enum: ['email', 'toast'],
    default: [],
  },
  status: {
    type: String,
    enum: ['active', 'resolved', 'suppressed'],
    default: 'active',
    index: true,
  },
  notified: {
    email: { type: Boolean, default: false },
    toast: { type: Boolean, default: false },
  },
  resolvedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// 复合索引优化查询性能
alertHistorySchema.index({ source: 1, level: 1, createdAt: -1 });
alertHistorySchema.index({ status: 1, createdAt: -1 });

// TTL 索引：30天后自动删除已解决的告警
alertHistorySchema.index(
  { resolvedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { status: 'resolved' } }
);

// TTL 索引：90天后自动删除活跃告警（长期未解决的）
alertHistorySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

/**
 * 监控日志 Schema
 */
const monitoringLogSchema = new Schema<MonitoringLogRecord>({
  source: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  healthStatus: {
    type: String,
    enum: ['healthy', 'degraded', 'critical'],
    required: true,
  },
  metrics: {
    source: { type: String, required: true },
    successRate: { type: Number, required: true },
    avgResponseTime: { type: Number, required: true },
    errorCount: { type: Number, required: true },
    rateLimitHits: { type: Number, default: 0 },
    totalRequests: { type: Number, required: true },
    successRequests: { type: Number, required: true },
    lastUpdated: { type: Number, required: true },
  },
  triggeredAlerts: {
    type: [String],
    default: [],
  },
}, {
  timestamps: true,
});

// 复合索引：按数据源和时间范围查询
monitoringLogSchema.index({ source: 1, timestamp: -1 });

// TTL 索引：详细日志保留30天
monitoringLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

/**
 * 导出模型
 */
export const AlertHistoryModel =
  (mongoose.models.AlertHistory as Model<AlertHistoryRecord>) ||
  mongoose.model<AlertHistoryRecord>('AlertHistory', alertHistorySchema);

export const MonitoringLogModel =
  (mongoose.models.MonitoringLog as Model<MonitoringLogRecord>) ||
  mongoose.model<MonitoringLogRecord>('MonitoringLog', monitoringLogSchema);

/**
 * 查询辅助函数
 */
export class AlertHistoryQueries {
  /**
   * 获取数据源的告警历史
   */
  static async findBySource(
    source: string,
    limit: number = 50,
    level?: string
  ): Promise<AlertHistoryRecord[]> {
    const query: any = { source };
    if (level) query.level = level;

    return AlertHistoryModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * 获取活跃告警
   */
  static async findActive(): Promise<AlertHistoryRecord[]> {
    return AlertHistoryModel
      .find({ status: 'active' })
      .sort({ level: -1, createdAt: -1 })
      .lean();
  }

  /**
   * 获取指定级别的告警
   */
  static async findByLevel(
    level: string,
    limit: number = 20
  ): Promise<AlertHistoryRecord[]> {
    return AlertHistoryModel
      .find({ level, status: 'active' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * 获取时间范围内的告警
   */
  static async findByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<AlertHistoryRecord[]> {
    return AlertHistoryModel
      .find({
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * 获取告警统计
   */
  static async getStats(
    source?: string,
    days: number = 7
  ): Promise<{
    total: number;
    byLevel: Record<string, number>;
    bySource: Record<string, number>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const matchQuery: any = {
      createdAt: { $gte: startDate },
    };
    if (source) matchQuery.source = source;

    const pipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          byLevel: {
            $push: '$level',
          },
          bySource: {
            $push: '$source',
          },
        },
      },
    ];

    const [result] = await AlertHistoryModel.aggregate(pipeline);

    if (!result) {
      return { total: 0, byLevel: {}, bySource: {} };
    }

    // 统计各级别数量
    const byLevel: Record<string, number> = {};
    result.byLevel.forEach((level: string) => {
      byLevel[level] = (byLevel[level] || 0) + 1;
    });

    // 统计各数据源数量
    const bySource: Record<string, number> = {};
    result.bySource.forEach((src: string) => {
      bySource[src] = (bySource[src] || 0) + 1;
    });

    return {
      total: result.total,
      byLevel,
      bySource,
    };
  }

  /**
   * 标记告警为已解决
   */
  static async markResolved(alertId: string): Promise<boolean> {
    const result = await AlertHistoryModel.updateOne(
      { _id: alertId, status: 'active' },
      { status: 'resolved', resolvedAt: new Date() }
    );
    return result.modifiedCount > 0;
  }

  /**
   * 标记数据源的所有告警为已解决
   */
  static async markSourceResolved(source: string): Promise<number> {
    const result = await AlertHistoryModel.updateMany(
      { source, status: 'active' },
      { status: 'resolved', resolvedAt: new Date() }
    );
    return result.modifiedCount;
  }
}

/**
 * 监控日志查询辅助函数
 */
export class MonitoringLogQueries {
  /**
   * 记录监控日志
   */
  static async createLog(log: Omit<MonitoringLogRecord, '_id'>): Promise<void> {
    await MonitoringLogModel.create(log);
  }

  /**
   * 获取数据源的监控日志
   */
  static async findBySource(
    source: string,
    startDate: Date,
    endDate: Date
  ): Promise<MonitoringLogRecord[]> {
    return MonitoringLogModel
      .find({
        source,
        timestamp: { $gte: startDate, $lte: endDate },
      })
      .sort({ timestamp: -1 })
      .lean();
  }

  /**
   * 获取健康趋势（用于仪表板图表）
   */
  static async getHealthTrend(
    source: string,
    hours: number = 24
  ): Promise<Array<{ timestamp: Date; healthStatus: string; score: number }>> {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const pipeline = [
      {
        $match: {
          source,
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' },
          },
          healthStatus: { $last: '$healthStatus' },
          score: { $avg: '$metrics.successRate' },
          timestamp: { $last: '$timestamp' },
        },
      },
      { $sort: { timestamp: 1 } },
    ];

    return MonitoringLogModel.aggregate(pipeline);
  }

  /**
   * 清理旧日志（由 TTL 索引自动处理，此函数可用于手动清理）
   */
  static async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await MonitoringLogModel.deleteMany({
      timestamp: { $lt: cutoffDate },
    });
    return result.deletedCount;
  }
}
