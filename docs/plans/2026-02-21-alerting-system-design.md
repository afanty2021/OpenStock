# 数据源健康监控与告警系统 - 设计文档

> 创建日期: 2026-02-21
> 状态: ✅ 已完成实现
> 版本: 1.0.0

## 概述

本系统为 OpenStock 多数据源聚合系统提供全面的健康监控和告警能力，支持分层分级告警、智能自适应检查、自动故障转移等核心功能。

## 核心功能

### 1. 分层分级告警

| 级别 | 触发条件 | 通知方式 | 抑制策略 |
|------|---------|---------|---------|
| **Critical** | 成功率 < 50%, 连续失败 > 10次 | 邮件 + Toast | 不抑制 |
| **Warning** | 成功率 50-80%, 响应时间 > 2s | Toast | 10分钟 |
| **Info** | 首次失败, API 速率限制 | Toast | 30分钟 |

### 2. 智能自适应检查

根据数据源健康状态动态调整检查频率：
- **健康状态**: 每 1 小时检查一次
- **降级状态**: 每 5 分钟检查一次
- **危急状态**: 每 1 分钟检查一次

### 3. 自动故障转移

- **自动降级**: 连续失败 > 10次 或 成功率 < 30%
- **自动恢复**: 连续成功 3 次，每 15 分钟尝试恢复
- **手动覆盖**: 支持管理员手动切换数据源状态

### 4. 监控仪表板

访问路径: `/admin/monitoring`

展示内容：
- 数据源状态卡片（在线/离线/降级）
- 成功率趋势图（24小时）
- 响应时间分布
- 错误计数排行
- 活跃告警列表
- 健康评分 (0-100)

## 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                     健康监控与告警系统                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐      ┌───────────────┐      ┌──────────────┐│
│  │ 实时监控层     │      │ 告警评估层     │      │ 通知分发层    ││
│  │               │      │               │      │              ││
│  │ • API调用记录  │ ───▶ │ • 规则引擎     │ ───▶ │ • 邮件服务    ││
│  │ • 指标聚合     │      │ • 级别判定     │      │ • Toast通知   ││
│  │ • 趋势分析     │      │ • 抑制检查     │      │              ││
│  └───────────────┘      └───────────────┘      └──────────────┘│
│         ▲                                                │     │
│         │                                                ▼     │
│  ┌───────────────┐                                ┌──────────┐ │
│  │ TelemetryCollector │                          │  用户    │ │
│  │ (现有基础设施)  │◀────────────────────────────│  管理员   │ │
│  └───────────────┘      告警历史                    └──────────┘ │
│         │                        ▲                            │
│         ▼                        │                            │
│  ┌───────────────┐               │                            │
│  │ 持久化层       │ ──────────────┘                            │
│  │               │                                            │
│  │ • MongoDB     │  告警记录                                   │
│  │ • 监控日志     │                                            │
│  └───────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

## 文件结构

```
lib/data-sources/alerting/
├── types.ts                    # 核心类型定义
├── rules-engine.ts             # 告警规则引擎
├── alert-manager.ts            # 告警管理器（支持抑制）
├── notifier.ts                 # 通知服务（邮件 + Toast）
├── health-checker.ts           # 智能自适应健康检查器
└── failover.ts                 # 自动故障转移服务

database/models/
└── alert-history.model.ts      # 告警历史和监控日志数据模型

app/api/
├── health/data-sources/route.ts    # 健康检查 API
└── monitoring/
    ├── alerts/route.ts             # 告警 API
    ├── metrics/route.ts            # 指标 API
    └── toasts/route.ts             # Toast 通知 API

app/(root)/admin/
└── monitoring/page.tsx         # 监控仪表板页面

scripts/
└── test-alerting-system.ts     # 告警系统测试脚本
```

## API 接口

### 健康检查 API

```
GET /api/health/data-sources
GET /api/health/data-sources?source=finnhub
```

响应格式：
```json
{
  "status": "healthy",
  "score": 88,
  "sources": [...],
  "summary": {
    "total": 3,
    "healthy": 2,
    "degraded": 1,
    "critical": 0
  }
}
```

### 告警 API

```
GET /api/monitoring/alerts              # 获取活跃告警
GET /api/monitoring/alerts?history=true # 获取告警历史
POST /api/monitoring/alerts             # 解决告警
```

### 指标 API

```
GET /api/monitoring/metrics             # 获取实时指标
GET /api/monitoring/metrics?source=xxx  # 获取指定数据源指标
GET /api/monitoring/metrics?trend=true  # 获取趋势数据
```

### Toast 通知 API

```
GET /api/monitoring/toasts              # 获取待显示的 Toast
POST /api/monitoring/toasts/consume     # 消费 Toast
```

## 配置说明

### 环境变量

```env
# 管理员邮箱（接收 Critical 告警）
ADMIN_EMAIL=admin@example.com

# 邮件服务（复用现有配置）
NODEMAILER_EMAIL=youraddress@gmail.com
NODEMAILER_PASSWORD=your_gmail_app_password
```

### 抑制配置

可通过 `alertManager.updateSuppressionConfig()` 运行时调整：

```typescript
alertManager.updateSuppressionConfig({
  critical: 0,        // 不抑制
  warning: 10 * 60 * 1000,   // 10分钟
  info: 30 * 60 * 1000,      // 30分钟
});
```

## 使用方式

### 1. 启动健康检查器

```typescript
import { adaptiveHealthChecker } from '@/lib/data-sources';

const sources = ['finnhub', 'tushare', 'alphaVantage'];
adaptiveHealthChecker.start(sources);
```

### 2. 监听故障转移事件

```typescript
import { failoverManager } from '@/lib/data-sources';

failoverManager.onFailover((event) => {
  console.log(`数据源 ${event.source} 已${event.type === 'degraded' ? '降级' : '恢复'}`);
});
```

### 3. 手动切换数据源

```typescript
// 禁用数据源
await failoverManager.toggleSource('finnhub', false);

// 启用数据源
await failoverManager.toggleSource('finnhub', true);
```

## 测试

运行测试脚本验证系统功能：

```bash
npx tsx scripts/test-alerting-system.ts
```

测试内容：
- ✅ 告警规则引擎（3 级别规则）
- ✅ 告警管理器（分层抑制策略）
- ✅ 通知服务（Toast 和邮件接口）
- ✅ 健康检查器（自适应检查周期）
- ✅ 故障转移（自动降级和恢复机制）

## 扩展建议

### 短期改进

1. **趋势图表**: 使用 Recharts 或 Chart.js 实现数据可视化
2. **告警分组**: 支持按数据源、级别、时间范围分组
3. **告警通知模板**: 支持自定义邮件和 Toast 模板

### 长期规划

1. **机器学习预测**: 基于历史数据预测潜在故障
2. **分布式追踪**: 集成 OpenTelemetry 进行请求追踪
3. **自动修复**: 检测到特定错误时自动执行修复操作

## 参考资料

- [CLAUDE.md - 项目文档](../../CLAUDE.md)
- [多数据源聚合系统设计](./2026-02-20-data-source-aggregation-design.md)
- [TelemetryCollector 源码](../../lib/data-sources/monitoring.ts)
