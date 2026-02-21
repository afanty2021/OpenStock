/**
 * 监控告警 API
 *
 * GET /api/monitoring/alerts - 获取活跃告警
 * GET /api/monitoring/alerts?history=true - 获取告警历史
 * GET /api/monitoring/alerts?level=xxx - 按级别筛选
 */

import { NextRequest, NextResponse } from 'next/server';
import { alertManager } from '@/lib/data-sources/alerting/alert-manager';
import { AlertHistoryQueries } from '@/database/models/alert-history.model';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const history = searchParams.get('history') === 'true';
    const level = searchParams.get('level');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (history) {
      // 获取告警历史
      const historyRecords = level
        ? await AlertHistoryQueries.findByLevel(level, limit)
        : await AlertHistoryQueries.findBySource(searchParams.get('source') || 'all', limit);

      return NextResponse.json({
        alerts: historyRecords,
        count: historyRecords.length,
      });
    }

    // 获取活跃告警
    let alerts = alertManager.getActiveAlerts();
    if (level) {
      alerts = alerts.filter(a => a.level === level);
    }

    return NextResponse.json({
      alerts,
      count: alerts.length,
      stats: alertManager.getStats(),
    });

  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * 解决告警
 * POST /api/monitoring/alerts/resolve
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, source } = body;

    let resolved = 0;
    if (alertId) {
      resolved = alertManager.resolveAlert(alertId) ? 1 : 0;
    } else if (source) {
      resolved = alertManager.resolveSourceAlerts(source);
    }

    // 同时更新数据库记录
    if (alertId) {
      await AlertHistoryQueries.markResolved(alertId);
    } else if (source) {
      await AlertHistoryQueries.markSourceResolved(source);
    }

    return NextResponse.json({ resolved });
  } catch (error) {
    console.error('Resolve alert error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}