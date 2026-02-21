/**
 * 监控仪表板页面
 *
 * 显示数据源健康状态、告警历史、监控指标等
 */

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Bell,
  TrendingUp,
  Clock,
} from 'lucide-react';

// 类型定义
interface SourceHealth {
  source: string;
  status: 'healthy' | 'degraded' | 'critical';
  score: number;
  enabled: boolean;
  issues: string[];
  lastChecked: number;
}

interface AlertItem {
  id: string;
  source: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  createdAt: number;
  status: 'active' | 'resolved';
}

interface MonitoringMetrics {
  source: string;
  successRate: number;
  avgResponseTime: number;
  errorCount: number;
  totalRequests: number;
}

export default function MonitoringPage() {
  const [healthStatus, setHealthStatus] = useState<SourceHealth[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [metrics, setMetrics] = useState<MonitoringMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 获取健康状态
  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health/data-sources');
      const data = await response.json();

      if (data.sources) {
        setHealthStatus(data.sources);
      }
    } catch (error) {
      console.error('获取健康状态失败:', error);
    }
  };

  // 获取告警
  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/monitoring/alerts');
      const data = await response.json();

      if (data.alerts) {
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('获取告警失败:', error);
    }
  };

  // 获取指标
  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/monitoring/metrics');
      const data = await response.json();

      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('获取指标失败:', error);
    }
  };

  // 刷新所有数据
  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchHealthStatus(),
      fetchAlerts(),
      fetchMetrics(),
    ]);
    setLoading(false);
  };

  // 解决告警
  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/monitoring/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });

      if (response.ok) {
        toast.success('告警已解决');
        fetchAlerts();
      }
    } catch (error) {
      toast.error('解决告警失败');
    }
  };

  // 初始化和自动刷新
  useEffect(() => {
    refreshAll();

    if (autoRefresh) {
      const interval = setInterval(refreshAll, 10000); // 10秒刷新
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // 获取状态图标和颜色
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">数据源监控仪表板</h1>
          <p className="text-muted-foreground mt-1">
            实时监控数据源健康状态和告警信息
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Clock className="h-4 w-4 mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
            {autoRefresh ? '自动刷新' : '手动刷新'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">总数据源</p>
              <p className="text-2xl font-bold">{healthStatus.length}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">健康</p>
              <p className="text-2xl font-bold text-green-600">
                {healthStatus.filter(s => s.status === 'healthy').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">降级</p>
              <p className="text-2xl font-bold text-yellow-600">
                {healthStatus.filter(s => s.status === 'degraded').length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">危急</p>
              <p className="text-2xl font-bold text-red-600">
                {healthStatus.filter(s => s.status === 'critical').length}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* 数据源状态卡片 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">数据源状态</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {healthStatus.map((source) => (
            <Card key={source.source} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(source.status)}
                  <h3 className="font-semibold">{source.source}</h3>
                </div>
                <Badge className={getStatusColor(source.status)}>
                  {source.status}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">健康评分</span>
                  <span className="font-medium">{source.score}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">启用状态</span>
                  <span className={source.enabled ? 'text-green-600' : 'text-red-600'}>
                    {source.enabled ? '启用' : '禁用'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">最后检查</span>
                  <span>{new Date(source.lastChecked).toLocaleTimeString()}</span>
                </div>
              </div>

              {source.issues.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-1">问题:</p>
                  <ul className="text-xs text-red-600 space-y-1">
                    {source.issues.map((issue, i) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 指标 */}
              {metrics.find(m => m.source === source.source) && (() => {
                const m = metrics.find(m => m.source === source.source)!;
                return (
                  <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-muted-foreground">成功率</p>
                      <p className="font-medium">{(m.successRate * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">响应时间</p>
                      <p className="font-medium">{m.avgResponseTime.toFixed(0)}ms</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">错误</p>
                      <p className="font-medium">{m.errorCount}</p>
                    </div>
                  </div>
                );
              })()}
            </Card>
          ))}
        </div>
      </div>

      {/* 活跃告警 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">活跃告警</h2>
          <Badge variant="outline" className="flex items-center gap-1">
            <Bell className="h-3 w-3" />
            {alerts.length}
          </Badge>
        </div>

        {alerts.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p>暂无活跃告警</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Card key={alert.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getLevelColor(alert.level)}>
                        {alert.level}
                      </Badge>
                      <h3 className="font-semibold">{alert.title}</h3>
                      <span className="text-xs text-muted-foreground">
                        {alert.source}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      触发时间: {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    解决
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 趋势图表区域 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">监控趋势</h2>
        <Card className="p-6">
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>趋势图表功能开发中</p>
              <p className="text-sm">将展示成功率、响应时间等趋势曲线</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
