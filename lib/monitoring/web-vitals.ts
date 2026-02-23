/**
 * Web Vitals 性能监控
 *
 * 监控 Core Web Vitals 指标，用于性能分析和优化
 * 支持 LCP、FID、CLS、FCP、TTFB 等关键指标
 *
 * @module lib/monitoring/web-vitals
 */

import { Metric } from 'web-vitals';

/**
 * 性能指标类型
 */
export type PerformanceMetric = Metric & {
  /** 自定义标签 */
  label?: string;
  /** 页面路径 */
  path?: string;
};

/**
 * 性能指标评分
 */
export enum MetricRating {
  /** 良好 */
  GOOD = 'good',
  /** 需要改进 */
  NEEDS_IMPROVEMENT = 'needs-improvement',
  /** 差 */
  POOR = 'poor',
}

/**
 * 性能数据报告
 */
export interface PerformanceReport {
  /** LCP (Largest Contentful Paint) - 最大内容绘制 */
  lcp?: PerformanceMetric;
  /** FID (First Input Delay) - 首次输入延迟 */
  fid?: PerformanceMetric;
  /** CLS (Cumulative Layout Shift) - 累积布局偏移 */
  cls?: PerformanceMetric;
  /** FCP (First Contentful Paint) - 首次内容绘制 */
  fcp?: PerformanceMetric;
  /** TTFB (Time to First Byte) - 首字节时间 */
  ttfb?: PerformanceMetric;
  /** 报告时间戳 */
  timestamp: number;
  /** 页面路径 */
  path: string;
}

/**
 * 性能评分阈值
 */
const RATING_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 },
} as const;

/**
 * 评估指标评分
 */
export function getMetricRating(
  metricName: keyof typeof RATING_THRESHOLDS,
  value: number
): MetricRating {
  const thresholds = RATING_THRESHOLDS[metricName];

  if (value <= thresholds.good) {
    return MetricRating.GOOD;
  }
  if (value <= thresholds.poor) {
    return MetricRating.NEEDS_IMPROVEMENT;
  }
  return MetricRating.POOR;
}

/**
 * 格式化指标值
 */
export function formatMetricValue(
  metricName: string,
  value: number
): string {
  switch (metricName) {
    case 'cls':
      return value.toFixed(3);
    case 'lcp':
    case 'fcp':
    case 'ttfb':
      return `${Math.round(value)} ms`;
    case 'fid':
      return `${Math.round(value)} ms`;
    default:
      return value.toString();
  }
}

/**
 * 性能监控类
 */
export class PerformanceMonitor {
  private metrics: Partial<Record<keyof PerformanceReport, PerformanceMetric>> = {};
  private callbacks: Set<(report: PerformanceReport) => void> = new Set();
  private path: string;

  constructor(path: string = '/') {
    this.path = path;
  }

  /**
   * 设置当前页面路径
   */
  setPath(path: string): void {
    this.path = path;
  }

  /**
   * 记录性能指标
   */
  recordMetric(name: keyof PerformanceReport, metric: PerformanceMetric): void {
    const enhancedMetric: PerformanceMetric = {
      ...metric,
      path: this.path,
    };
    this.metrics[name] = enhancedMetric;

    // 检查是否所有主要指标都已收集
    if (this.metrics.lcp && this.metrics.cls && (this.metrics.fid || this.metrics.ttfb)) {
      this.report();
    }
  }

  /**
   * 注册报告回调
   */
  onReport(callback: (report: PerformanceReport) => void): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * 生成性能报告
   */
  private report(): void {
    const report: PerformanceReport = {
      lcp: this.metrics.lcp,
      fid: this.metrics.fid,
      cls: this.metrics.cls,
      fcp: this.metrics.fcp,
      ttfb: this.metrics.ttfb,
      timestamp: Date.now(),
      path: this.path,
    };

    this.callbacks.forEach((callback) => {
      try {
        callback(report);
      } catch (error) {
        console.error('Error in performance report callback:', error);
      }
    });
  }

  /**
   * 获取当前收集的指标
   */
  getMetrics(): Partial<PerformanceReport> {
    return { ...this.metrics };
  }

  /**
   * 重置监控
   */
  reset(): void {
    this.metrics = {};
  }
}

/**
 * 单例监控器实例
 */
let globalMonitor: PerformanceMonitor | null = null;

/**
 * 获取全局性能监控器
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * 在浏览器环境中初始化性能监控
 *
 * @param callback - 接收性能报告的回调函数
 * @returns 清理函数
 */
export async function initPerformanceMonitoring(
  callback: (report: PerformanceReport) => void
): Promise<() => void> {
  if (typeof window === 'undefined') {
    return () => {};
  }

  try {
    const { onCLS, onFID, onLCP, onFCP, onTTFB } = await import('web-vitals');
    const monitor = getPerformanceMonitor();

    // 注册回调
    const unsubscribe = monitor.onReport(callback);

    // 监听各项指标
    const unsubscribeCLS = onCLS((metric) => {
      monitor.recordMetric('cls', metric as PerformanceMetric);
    });

    const unsubscribeFID = onFID((metric) => {
      monitor.recordMetric('fid', metric as PerformanceMetric);
    });

    const unsubscribeLCP = onLCP((metric) => {
      monitor.recordMetric('lcp', metric as PerformanceMetric);
    });

    const unsubscribeFCP = onFCP((metric) => {
      monitor.recordMetric('fcp', metric as PerformanceMetric);
    });

    const unsubscribeTTFB = onTTFB((metric) => {
      monitor.recordMetric('ttfb', metric as PerformanceMetric);
    });

    // 返回清理函数
    return () => {
      unsubscribe();
      unsubscribeCLS();
      unsubscribeFID();
      unsubscribeLCP();
      unsubscribeFCP();
      unsubscribeTTFB();
    };
  } catch (error) {
    console.error('Failed to initialize performance monitoring:', error);
    return () => {};
  }
}

/**
 * 计算性能得分
 *
 * 根据所有指标的评分计算总体得分 (0-100)
 */
export function calculatePerformanceScore(report: PerformanceReport): number {
  let score = 100;
  let weight = 0;

  const weights = {
    lcp: 0.25,
    fid: 0.25,
    cls: 0.25,
    fcp: 0.15,
    ttfb: 0.1,
  };

  const metrics = [
    { name: 'lcp' as const, metric: report.lcp },
    { name: 'fid' as const, metric: report.fid },
    { name: 'cls' as const, metric: report.cls },
    { name: 'fcp' as const, metric: report.fcp },
    { name: 'ttfb' as const, metric: report.ttfb },
  ];

  let totalWeight = 0;

  metrics.forEach(({ name, metric }) => {
    if (!metric) return;

    const rating = getMetricRating(name, metric.value);
    let metricScore = 100;

    switch (rating) {
      case MetricRating.GOOD:
        metricScore = 100;
        break;
      case MetricRating.NEEDS_IMPROVEMENT:
        metricScore = 50;
        break;
      case MetricRating.POOR:
        metricScore = 0;
        break;
    }

    totalWeight += weights[name];
    score -= (weights[name] * (100 - metricScore));
  });

  return totalWeight > 0 ? Math.round(score / totalWeight * 100) / 100 : 0;
}

/**
 * 导出性能报告到分析服务
 */
export function exportPerformanceReport(report: PerformanceReport): string {
  return JSON.stringify({
    timestamp: report.timestamp,
    path: report.path,
    metrics: {
      lcp: report.lcp?.value,
      fid: report.fid?.value,
      cls: report.cls?.value,
      fcp: report.fcp?.value,
      ttfb: report.ttfb?.value,
    },
    ratings: {
      lcp: report.lcp ? getMetricRating('lcp', report.lcp.value) : undefined,
      fid: report.fid ? getMetricRating('fid', report.fid.value) : undefined,
      cls: report.cls ? getMetricRating('cls', report.cls.value) : undefined,
      fcp: report.fcp ? getMetricRating('fcp', report.fcp.value) : undefined,
      ttfb: report.ttfb ? getMetricRating('ttfb', report.ttfb.value) : undefined,
    },
    score: calculatePerformanceScore(report),
  });
}
