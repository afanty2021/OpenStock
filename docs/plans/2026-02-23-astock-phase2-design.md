# A 股功能扩展 - 第二阶段设计文档

**项目**: OpenStock
**日期**: 2026-02-23
**版本**: 1.0
**状态**: 规划中

---

## 概述

### 背景

第一阶段已实现 A 股核心基础设施：
- Tushare 数据源适配器（基础接口）
- AStockCodeUtil - A 股代码标准化
- LimitDetector - 涨跌停检测
- TradingCalendar - 交易日历
- TradingAwareScheduler - 交易时段感知调度器

### 第二阶段目标

完善 A 股特色数据展示和监控，实现以下功能：

1. **龙虎榜数据展示** - 完善 top_list 接口，添加前端展示组件
2. **资金流向监控** - 完善 moneyflow 接口，添加流入/流出监控
3. **板块指数支持** - 添加概念板块、行业板块资金流向
4. **A股特有指标** - 融资融券、每日指标增强

### 设计原则

- **复用第一阶段模块** - 基于现有交易日历和调度器
- **模块化设计** - 每个功能独立，便于测试
- **渐进式交付** - 可分任务逐步完成

---

## 需求分析

### 功能需求

| 需求ID | 描述 | 优先级 |
|--------|------|--------|
| F1 | 龙虎榜列表展示（当日TOP10） | P0 |
| F2 | 龙虎榜明细接口（历史数据） | P1 |
| F3 | 单只股票资金流向 | P0 |
| F4 | 板块资金流向（行业/概念） | P1 |
| F5 | 每日指标增强展示（PE/PB/换手率） | P0 |
| F6 | 融资融券数据 | P1 |

### Tushare API 接口映射

| 功能 | Tushare 接口 | 当前状态 |
|------|-------------|---------|
| 龙虎榜列表 | top_list | 已实现基础 |
| 龙虎榜明细 | top_inst | 待实现 |
| 资金流向 | moneyflow_hsgt | 待扩展 |
| 板块资金 | block_trade | 待实现 |
| 每日指标 | daily_basic | 已实现 |
| 融资融券 | margin_detail | 待实现 |

---

## 架构设计

### 目录结构

```
lib/data-sources/
├── astock/
│   ├── index.ts                      # 导出
│   ├── code-util.ts                 # [已完成] 代码标准化
│   ├── limit-detector.ts            # [已完成] 涨跌停检测
│   ├── trading-calendar.ts          # [已完成] 交易日历
│   ├── trading-aware-scheduler.ts    # [已完成] 调度器
│   ├── top-list-viewer.ts           # [新增] 龙虎榜查看器
│   ├── money-flow-monitor.ts         # [新增] 资金流向监控
│   ├── sector-tracker.ts             # [新增] 板块追踪器
│   └── margin-trading.ts             # [新增] 融资融券
├── sources/
│   └── tushare.ts                    # [扩展] 补充接口
```

### 数据流

```
用户请求
    │
    ▼
┌─────────────────────────────────────┐
│  TradingAwareScheduler              │
│  (控制请求频率，交易时段感知)        │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  TushareSource                      │
│  - getTopList()                     │
│  - getMoneyFlow()                   │
│  - getDailyBasic()                  │
│  - getBlockTrade() [新增]            │
│  - getMarginDetail() [新增]         │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  数据处理模块                        │
│  - TopListViewer                    │
│  - MoneyFlowMonitor                 │
│  - SectorTracker                    │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  前端组件 (UI Layer)                │
│  - TopListPanel                     │
│  - MoneyFlowChart                    │
│  - SectorHeatmap                     │
└─────────────────────────────────────┘
```

---

## 模块详细设计

### 1. TopListViewer - 龙虎榜查看器

**功能**：
- 获取当日龙虎榜数据
- 支持历史查询（最近N个交易日）
- 排序和筛选功能

**接口设计**：

```typescript
interface TopListItem {
  tsCode: string;        // 股票代码
  name: string;          // 股票名称
  reason: string;        // 上榜理由
  buyAmount: number;     // 买入金额(万元)
  sellAmount: number;    // 卖出金额(万元)
  netAmount: number;     // 净买入(万元)
  rank: number;          // 排名
}

interface TopListViewer {
  // 获取当日龙虎榜
  getTodayTopList(): Promise<TopListItem[]>;

  // 获取历史龙虎榜
  getHistoricalTopList(days: number): Promise<TopListItem[]>;

  // 获取单只股票的龙虎榜历史
  getStockTopListHistory(symbol: string, days: number): Promise<TopListItem[]>;
}
```

**Tushare 接口**：
- `top_list` - 当日龙虎榜
- `top_inst` - 机构席位明细

### 2. MoneyFlowMonitor - 资金流向监控

**功能**：
- 获取个股资金流向
- 判断主力资金流入/流出
- 异常大单检测

**接口设计**：

```typescript
interface MoneyFlowData {
  tsCode: string;
  tradeDate: string;
  // 资金流向
  netMainInflow: number;    // 主力净流入(万元)
  mainInflowRate: number;   // 主力净流入占比%
  // 单量分析
  largeBuy: number;          // 大单买入(万股)
  largeSell: number;        // 大单卖出(万股)
  largeNet: number;         // 大单净买(万股)
  // 散户判断
  retailInflow: number;     // 散户净流入(万元)
}

interface MoneyFlowMonitor {
  // 获取个股资金流向
  getStockMoneyFlow(symbol: string, date?: string): Promise<MoneyFlowData>;

  // 获取资金流向趋势
  getMoneyFlowTrend(symbol: string, days: number): Promise<MoneyFlowData[]>;

  // 实时监控大单
  monitorLargeOrders(symbol: string): Promise<LargeOrder[]>;
}
```

**Tushare 接口**：
- `moneyflow_hsgt` - 沪深港通资金流向
- `moneyflow` - 个股资金流向

### 3. SectorTracker - 板块追踪器

**功能**：
- 获取行业板块资金流向
- 获取概念板块资金流向
- 板块涨跌幅排行

**接口设计**：

```typescript
interface SectorData {
  sectorCode: string;     // 板块代码
  sectorName: string;     // 板块名称
  mainInflow: number;     // 主力净流入(万元)
  inflowChange: number;   // 流入变化%
  changePercent: number;  // 板块涨跌幅%
  stockCount: number;    // 成分股数量
}

interface SectorTracker {
  // 获取行业板块资金排行
  getIndustryFlowRank(): Promise<SectorData[]>;

  // 获取概念板块资金排行
  getConceptFlowRank(): Promise<SectorData[]>;

  // 获取板块成分股
  getSectorStocks(sectorCode: string): Promise<string[]>;

  // 获取板块今日资金流向
  getSectorFlow(sectorCode: string): Promise<SectorData>;
}
```

**Tushare 接口**：
- `block_trade` - 板块交易数据
- `concept_detail` - 概念板块明细

### 4. MarginTrading - 融资融券

**功能**：
- 融资余额查询
- 融券余额查询
- 融资买入/偿还分析

**接口设计**：

```typescript
interface MarginData {
  tsCode: string;
  tradeDate: string;
  marginBalance: number;    // 融资余额(万元)
  marginBuy: number;        // 融资买入(万元)
  marginRepay: number;     // 融资偿还(万元)
  shortBalance: number;    // 融券余额(万元)
  shortSell: number;       // 融券卖出(万元)
  shortCover: number;      // 融券偿还(万元)
}

interface MarginTrading {
  // 获取融资融券数据
  getMarginData(symbol: string, date?: string): Promise<MarginData>;

  // 获取融资融券趋势
  getMarginTrend(symbol: string, days: number): Promise<MarginData[]>;
}
```

**Tushare 接口**：
- `margin_detail` - 融资融券明细

---

## 数据类型扩展

### 扩展 types.ts

```typescript
// 龙虎榜数据类型
export interface TopListData {
  ts_code: string;
  name: string;
  reason: string;
  buy_amount: number;
  sell_amount: number;
  net_amount: number;
}

// 资金流向数据类型
export interface MoneyFlowData {
  ts_code: string;
  trade_date: string;
  net_main_inflow: number;
  main_inflow_rate: number;
  large_buy: number;
  large_sell: number;
  large_net: number;
}

// 板块数据类型
export interface SectorData {
  sector_code: string;
  sector_name: string;
  main_inflow: number;
  change_percent: number;
  stock_count: number;
}

// 融资融券数据类型
export interface MarginData {
  ts_code: string;
  trade_date: string;
  margin_balance: number;
  short_balance: number;
}
```

---

## 前端组件设计

### 1. TopListPanel - 龙虎榜面板

```tsx
interface TopListPanelProps {
  title?: string;
  limit?: number;        // 显示条数，默认10
  showReason?: boolean;  // 显示上榜理由
}
```

功能：
- 展示当日龙虎榜TOP10
- 支持净买入/净卖出排序
- 点击股票跳转详情

### 2. MoneyFlowCard - 资金流向卡片

```tsx
interface MoneyFlowCardProps {
  symbol: string;
  showTrend?: boolean;   // 显示5日趋势
  theme?: 'light' | 'dark';
}
```

功能：
- 显示主力资金流入/流出
- 颜色编码（红=流入，绿=流出）
- 显示大单交易情况

### 3. SectorHeatmap - 板块热力图

```tsx
interface SectorHeatmapProps {
  type: 'industry' | 'concept';
  period?: 'day' | 'week' | 'month';
}
```

功能：
- 板块资金流向可视化
- 支持行业/概念切换
- 鼠标悬停显示详情

---

## 实施计划

### 任务拆分

#### Task 1: 龙虎榜模块完善
- [ ] 1.1 扩展 Tushare getTopList 接口（添加历史查询）
- [ ] 1.2 实现 TopListViewer 类
- [ ] 1.3 编写单元测试（覆盖率>80%）
- [ ] 1.4 创建 TopListPanel 组件
- [ ] 1.5 集成到股票详情页

#### Task 2: 资金流向监控
- [ ] 2.1 扩展 Tushare getMoneyFlow 接口（添加更多字段）
- [ ] 2.2 实现 MoneyFlowMonitor 类
- [ ] 2.3 编写单元测试（覆盖率>80%）
- [ ] 2.4 创建 MoneyFlowCard 组件
- [ ] 2.5 集成到股票详情页

#### Task 3: 板块指数支持
- [ ] 3.1 新增 Tushare block_trade 接口
- [ ] 3.2 实现 SectorTracker 类
- [ ] 3.3 编写单元测试（覆盖率>80%）
- [ ] 3.4 创建 SectorHeatmap 组件
- [ ] 3.5 创建板块列表页面

#### Task 4: 融资融券数据
- [ ] 4.1 新增 Tushare margin_detail 接口
- [ ] 4.2 实现 MarginTrading 类
- [ ] 4.3 编写单元测试（覆盖率>80%）
- [ ] 4.4 创建 MarginPanel 组件
- [ ] 4.5 集成到股票详情页

### 交付标准

- [ ] 每个 Task 独立可运行
- [ ] 测试覆盖率 > 80%
- [ ] 文档更新（CLAUDE.md）
- [ ] 提交信息遵循conventional commits

---

## 错误处理

### API 错误处理

```typescript
try {
  const data = await tushare.getTopList(date);
} catch (error) {
  if (error.message.includes('invalid date')) {
    // 日期格式错误
    throw new ValidationError('请输入正确的日期格式 YYYYMMDD');
  }
  if (error.message.includes('no data')) {
    // 无数据（节假日）
    return []; // 返回空数组而非报错
  }
  // 其他错误
  throw error;
}
```

### 数据验证

- 股票代码格式验证
- 日期范围验证（不超过历史5年）
- 数值类型校验

---

## 测试策略

### 单元测试

使用 Jest + TypeScript：

```typescript
// top-list-viewer.test.ts
describe('TopListViewer', () => {
  it('should fetch today top list', async () => {
    const viewer = new TopListViewer(tushare);
    const result = await viewer.getTodayTopList();
    expect(result).toBeInstanceOf(Array);
  });

  it('should sort by net amount', async () => {
    const viewer = new TopListViewer(tushare);
    const result = await viewer.getTodayTopList();
    // 验证排序
  });
});
```

### 测试数据

- Mock Tushare API 响应
- 使用静态 JSON 文件存储测试数据
- 覆盖边界情况（节假日无数据）

---

## 依赖关系

```
Task 1 (龙虎榜)
    │
    ├── 依赖: Tushare top_list 接口
    └── 前置: 第一阶段 Tushare 基础
            │
            └── 已完成

Task 2 (资金流向)
    │
    ├── 依赖: Tushare moneyflow 接口
    └── 前置: 第一阶段 Tushare 基础

Task 3 (板块追踪)
    │
    ├── 依赖: Tushare block_trade 接口
    └── 前置: 第一阶段 Tushare 基础

Task 4 (融资融券)
    │
    ├── 依赖: Tushare margin_detail 接口
    └── 前置: 第一阶段 Tushare 基础
```

---

## 验收标准

### 功能验收

| 功能 | 验收条件 |
|------|---------|
| 龙虎榜 | 能获取当日TOP10，支持排序 |
| 资金流向 | 显示主力净流入，支持趋势查看 |
| 板块追踪 | 显示行业/概念板块资金排行 |
| 融资融券 | 显示融资融券余额 |

### 质量验收

| 指标 | 目标 |
|------|------|
| 测试覆盖率 | > 80% |
| API 响应时间 | P95 < 2s |
| 代码规范 | ESLint 通过 |

---

## 后续扩展

### Phase 3 规划

1. **实时大单推送** - WebSocket 连接
2. **自定义筛选** - 用户自定义龙虎榜筛选条件
3. **板块联动** - 板块与个股关联分析
4. **资金流向预测** - AI 预测资金趋势
