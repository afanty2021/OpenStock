/**
 * 监控指标 API
 *
 * GET /api/monitoring/metrics - 获取实时监控指标
 * GET /api/monitoring/metrics?source=xxx - 获取指定数据源指标
 * GET /api/monitoring/metrics?trend=true - 获取趋势数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { telemetryCollector } from '@/lib/data-sources/monitoring';
import { MonitoringLogQueries } from '@/database/models/alert-history.model';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source');
    const trend = searchParams.get('trend') === 'true';
    const hours = parseInt(searchParams.get('hours') || '24');

    if (trend) {
      // 获取趋势数据
      const trendData = source
        ? await MonitoringLogQueries.getHealthTrend(source || 'all', hours)
        : [];

      return NextResponse.json({
        trend: trendData,
        source: source || 'all',
        hours,
      });
    }

    if (source) {
      // 获取指定数据源指标
      const metrics = telemetryCollector.getMetrics(source);
      const systemHealth = telemetryCollector.getSystemHealth();

      return NextResponse.json({
        source,
        metrics,
        health: systemHealth,
      });
    }

    // 获取所有数据源指标
    const allMetrics = telemetryCollector.getAllMetrics();

    return NextResponse.json({
      metrics: allMetrics,
      count: allMetrics.length,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}