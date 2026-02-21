/**
 * 数据源健康检查 API
 *
 * GET /api/health/data-sources - 获取所有数据源健康状态
 * GET /api/health/data-sources?source=xxx - 获取指定数据源健康状态
 *
 * 用途：外部监控系统（如 UptimeRobot、Pingdom）
 */

import { NextRequest, NextResponse } from 'next/server';
import { adaptiveHealthChecker } from '@/lib/data-sources/alerting/health-checker';
import { failoverManager } from '@/lib/data-sources/alerting/failover';
import { alertManager } from '@/lib/data-sources/alerting/alert-manager';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source');

    // 检查健康检查器是否已启动
    if (!adaptiveHealthChecker.isActive()) {
      return NextResponse.json(
        {
          status: 'uninitialized',
          message: 'Health checker not started',
        },
        { status: 503 }
      );
    }

    // 获取指定数据源状态
    if (source) {
      const healthStatus = adaptiveHealthChecker.getHealthStatus(source);
      const failoverState = failoverManager.getSourceState(source);
      const alerts = alertManager.getSourceAlerts(source);

      return NextResponse.json({
        source: healthStatus.source,
        status: healthStatus.status,
        score: healthStatus.score,
        enabled: healthStatus.enabled,
        failover: failoverState,
        issues: healthStatus.issues,
        activeAlerts: alerts.length,
        lastChecked: healthStatus.lastChecked,
      });
    }

    // 获取所有数据源状态
    const allStatus = adaptiveHealthChecker.getAllHealthStatus();
    const allFailoverStates = failoverManager.getAllStates();
    const allAlerts = alertManager.getActiveAlerts();

    // 计算整体健康状态
    const criticalCount = allStatus.filter(s => s.status === 'critical').length;
    const degradedCount = allStatus.filter(s => s.status === 'degraded').length;
    const healthyCount = allStatus.filter(s => s.status === 'healthy').length;

    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalCount > 0) {
      overallStatus = 'critical';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    }

    // 计算平均健康评分
    const avgScore = allStatus.length > 0
      ? allStatus.reduce((sum, s) => sum + s.score, 0) / allStatus.length
      : 0;

    return NextResponse.json({
      status: overallStatus,
      score: Math.round(avgScore),
      sources: allStatus.map(status => {
        const failoverState = allFailoverStates.find(f => f.source === status.source);
        return {
          ...status,
          failover: failoverState,
        };
      }),
      summary: {
        total: allStatus.length,
        healthy: healthyCount,
        degraded: degradedCount,
        critical: criticalCount,
        activeAlerts: allAlerts.length,
      },
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Health check API error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * 健康检查 API 响应格式
 *
 * 单个数据源:
 * {
 *   "source": "finnhub",
 *   "status": "healthy",
 *   "score": 95,
 *   "enabled": true,
 *   "failover": { "enabled": true, "isPrimary": true, ... },
 *   "issues": [],
 *   "activeAlerts": 0,
 *   "lastChecked": 1708500000000
 * }
 *
 * 所有数据源:
 * {
 *   "status": "healthy",
 *   "score": 88,
 *   "sources": [...],
 *   "summary": { "total": 3, "healthy": 2, "degraded": 1, "critical": 0 },
 *   "timestamp": 1708500000000
 * }
 */