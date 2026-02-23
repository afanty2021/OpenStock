# A 股功能模块 (astock)

## 模块概述

提供 A 股市场专用功能，包括代码格式标准化、市场类型检测、涨跌停限制计算、涨跌停检测和交易日历管理等。

## 目录结构

```
lib/data-sources/astock/
├── index.ts                  # 模块入口，导出公共 API
├── code-util.ts              # 代码格式标准化工具
├── limit-detector.ts         # 涨跌停检测器
├── trading-calendar.ts       # 交易日历管理
├── trading-aware-scheduler.ts # 交易时段感知调度器
├── top-list-viewer.ts        # 龙虎榜查看器
├── money-flow-monitor.ts     # 资金流向监控器
├── sector-tracker.ts         # 板块追踪器
├── margin-trading.ts         # 融资融券数据类
└── __tests__/
    ├── code-util.test.ts     # 代码工具测试（72 个测试用例）
    ├── limit-detector.test.ts# 涨跌停检测测试（34 个测试用例）
    ├── trading-calendar.test.ts # 交易日历测试（83 个测试用例）
    ├── top-list-viewer.test.ts # 龙虎榜查看器测试
    ├── money-flow-monitor.test.ts # 资金流向监控器测试
    ├── sector-tracker.test.ts # 板块追踪器测试
    └── margin-trading.test.ts # 融资融券数据测试（39 个测试用例）
```

## 测试统计

| 模块 | 测试用例 | 语句覆盖率 | 分支覆盖率 | 函数覆盖率 |
|------|---------|-----------|-----------|-----------|
| code-util.ts | 72 | 93.1% | 90.32% | 100% |
| limit-detector.ts | 34 | ~90% | ~85% | 100% |
| trading-calendar.ts | 83 | 88.31% | 86.84% | 100% |
| money-flow-monitor.ts | 45+ | ~90% | ~85% | 100% |
| sector-tracker.ts | 50+ | ~90% | ~85% | 100% |
| margin-trading.ts | 39 | 94.96% | 85.14% | 100% |
| **总计** | **320+** | **~91%** | **~86%** | **100%** |

## 核心功能

### TradingCalendar - 交易日历管理

提供 A 股交易时间判断和交易日历管理功能。

#### 主要方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `getTradingStatus(date?)` | 获取当前交易时段状态 | `TradingStatus` |
| `isTradingDay(date)` | 判断是否为交易日 | `boolean` |
| `isHoliday(date)` | 判断是否为休市日 | `boolean` |
| `getNextTradingDay(date?)` | 获取下一个交易日 | `Date` |
| `getNextOpen(date?)` | 获取下一个开盘时间 | `Date` |

#### 交易状态

```typescript
type TradingStatusCode =
  | 'TRADING'      // 交易中
  | 'PRE_MARKET'   // 集合竞价
  | 'LUNCH_BREAK'  // 午间休市
  | 'CLOSED'       // 收市后
  | 'HOLIDAY';     // 法定节假日

interface TradingStatus {
  status: TradingStatusCode;
  session?: 'MORNING' | 'AFTERNOON';
  note?: string;
  nextOpen?: Date;
}
```

#### A 股交易时段

| 时段 | 开始时间 | 结束时间 | 说明 |
|------|---------|---------|------|
| 集合竞价 | 09:15 | 09:25 | 价格确定阶段 |
| 上午交易 | 09:30 | 11:30 | 连续竞价 |
| 午间休市 | 11:30 | 13:00 | 暂停交易 |
| 下午交易 | 13:00 | 15:00 | 连续竞价 |

#### 使用示例

```typescript
import { TradingCalendar } from '@/lib/data-sources/astock';

// 获取当前交易状态
const status = TradingCalendar.getTradingStatus();
console.log(status.status); // 'TRADING'
console.log(status.session); // 'MORNING'

// 判断是否为交易日
const isTrading = TradingCalendar.isTradingDay(new Date());

// 获取下一个开盘时间
const nextOpen = TradingCalendar.getNextOpen();
```

### LimitDetector - 涨跌停检测器

#### 主要方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `isAStock(symbol)` | 判断是否为 A 股代码 | `boolean` |
| `getMarketType(symbol)` | 获取市场类型 | `MarketType \| undefined` |
| `getLimitPct(symbol, name?)` | 获取涨跌停限制比例 | `number` |
| `normalize(symbol)` | 标准化代码格式 | `string` |
| `toFinnhubCode(symbol)` | 转换为 Finnhub 格式 | `string` |
| `toTushareCode(symbol)` | 转换为 Tushare 格式 | `string` |
| `getExchange(symbol)` | 获取交易所后缀 | `EXCHANGE_SUFFIX \| undefined` |
| `isValidCode(symbol)` | 验证代码格式 | `boolean` |
| `extractCode(symbol)` | 提取纯代码 | `string` |

#### 支持的市场类型

```typescript
enum MarketType {
  SH_MAIN = 'SH_MAIN',  // 上海主板 (600xxx, 601xxx, 603xxx, 605xxx)
  SH_STAR = 'SH_STAR',  // 上海科创板 (688xxx, 689xxx)
  SZ_MAIN = 'SZ_MAIN',  // 深圳主板 (000xxx, 001xxx)
  SZ_GEM = 'SZ_GEM',    // 深圳创业板 (300xxx, 301xxx)
  BSE = 'BSE',          // 北交所 (8xxxxx, 4xxxxx)
}
```

#### 涨跌停限制规则

| 市场类型 | 涨跌停限制 | 代码范围 |
|---------|-----------|---------|
| 上海主板 | ±10% | 600000-605999 |
| 上海科创板 | ±20% | 688000-689999 |
| 深圳主板 | ±10% | 000001-001999 |
| 深圳创业板 | ±20% | 300000-301999 |
| 北交所 | ±30% | 800000-899999, 400000-499999 |
| ST 股票 | ±5% | 名称包含 ST/*ST/S*ST |

### LimitDetector - 涨跌停检测器

#### 主要方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `detectLimitStatus(quote)` | 检测当前涨跌停状态 | `LimitStatus` |
| `predictLimitDistance(quote)` | 预测距离涨跌停的空间 | `LimitPrediction` |
| `isNearLimit(quote, threshold?)` | 判断是否接近涨跌停 | `boolean` |

#### 使用示例

```typescript
import { LimitDetector } from '@/lib/data-sources/astock';

const quote: QuoteData = {
  symbol: '600519.SH',
  c: 108,
  pc: 100,
  dp: 8,
  // ...
};

// 检测涨跌停状态
const status = LimitDetector.detectLimitStatus(quote); // 'NORMAL'

// 预测距离涨跌停
const prediction = LimitDetector.predictLimitDistance(quote);
console.log(prediction.toUpper.pct); // 2 (距离涨停 2%)

// 判断是否接近涨跌停
const isNear = LimitDetector.isNearLimit(quote); // true
```

## 使用示例

### 交易日历管理

```typescript
import { TradingCalendar } from '@/lib/data-sources/astock';

// 获取当前交易状态
const status = TradingCalendar.getTradingStatus();
console.log(status.status); // 'TRADING'
console.log(status.session); // 'MORNING'

// 判断是否为交易日
const isTrading = TradingCalendar.isTradingDay(new Date());

// 获取下一个开盘时间
const nextOpen = TradingCalendar.getNextOpen();
```

### 代码格式标准化

```typescript
import { AStockCodeUtil } from '@/lib/data-sources/astock';

// 判断是否为 A 股
AStockCodeUtil.isAStock('600519');        // true
AStockCodeUtil.isAStock('600519.SH');     // true
AStockCodeUtil.isAStock('AAPL');          // false

// 标准化代码格式
AStockCodeUtil.normalize('600519');       // '600519.SH'
AStockCodeUtil.normalize('600519.SS');    // '600519.SH' (Finnhub → 标准)
AStockCodeUtil.normalize('600519.SH');    // '600519.SH'

// 获取市场类型
AStockCodeUtil.getMarketType('600519.SH'); // MarketType.SH_MAIN
AStockCodeUtil.getMarketType('688001.SH'); // MarketType.SH_STAR
AStockCodeUtil.getMarketType('300001.SZ'); // MarketType.SZ_GEM
```

### 涨跌停限制计算

```typescript
// 获取涨跌停限制
AStockCodeUtil.getLimitPct('600519.SH');              // 10 (主板 10%)
AStockCodeUtil.getLimitPct('688001.SH');              // 20 (科创板 20%)
AStockCodeUtil.getLimitPct('300001.SZ');              // 20 (创业板 20%)
AStockCodeUtil.getLimitPct('832566.BJ');              // 30 (北交所 30%)
AStockCodeUtil.getLimitPct('600519.SH', 'STPingAn');  // 5 (ST 股票 5%)
```

### 数据源代码转换

```typescript
// Finnhub 格式转换
AStockCodeUtil.toFinnhubCode('600519.SH');  // '600519.SS'
AStockCodeUtil.toFinnhubCode('000001.SZ');  // '000001.se'

// Tushare 格式转换
AStockCodeUtil.toTushareCode('600519.SS');  // '600519.SH'
AStockCodeUtil.toTushareCode('000001.se');  // '000001.SZ'
```

## 测试

```bash
# 运行单元测试
npm run test -- lib/data-sources/astock/__tests__/code-util.test.ts

# 运行测试覆盖率
npm run test:coverage -- lib/data-sources/astock/__tests__/code-util.test.ts
```

### 测试覆盖率

- **语句覆盖率**: 93.1%
- **分支覆盖率**: 90.32%
- **函数覆盖率**: 100%
- **行覆盖率**: 95.77%
- **测试用例数**: 72 个

## A 股代码模式

### 正则表达式规则

```typescript
// 上海主板：600000-605999
/^60[0-5]\d{3}$/

// 上海科创板：688000-689999
/^68[89]\d{3}$/

// 深圳主板：000001-001999
/^00[0-1]\d{3}$/

// 深圳创业板：300000-301999
/^30[0-1]\d{3}$/

// 北交所：800000-899999, 400000-499999
/^[48]\d{5}$/
```

### 代码格式对照表

| 数据源 | 格式示例 | 说明 |
|--------|---------|------|
| **标准格式** | 600519.SH | 使用 .SH/.SZ/.BJ 后缀 |
| **Finnhub** | 600519.SS | 上海使用 .SS，深圳使用 .se（小写） |
| **Tushare** | 600519.SH | 与标准格式一致 |
| **Yahoo Finance** | 600519.SS | 与 Finnhub 一致 |

## 设计考虑

1. **精确模式匹配**: 使用严格的正则表达式，避免误匹配
2. **多格式支持**: 支持 Finnhub、Tushare、Yahoo Finance 等主流数据源格式
3. **涨跌停规则**: 根据市场类型和股票名称（ST）动态计算限制
4. **类型安全**: 使用 TypeScript 枚举确保类型安全

## 相关文档

- [设计文档](../../../../docs/plans/2026-02-22-astock-phase1-design.md) - A 股功能扩展第一阶段设计
- [lib/data-sources/CLAUDE.md](../CLAUDE.md) - 多数据源聚合系统文档

## 扩展计划

### 第一阶段（已完成）

- [x] 代码格式标准化工具
- [x] 涨跌停检测器
- [x] 交易时间适配
- [x] 交易时段感知调度器
- [x] Tushare A 股特色数据扩展

### 第二阶段（进行中）

- [x] 龙虎榜查看器 (TopListViewer)
- [x] 资金流向监控器 (MoneyFlowMonitor)
- [x] 板块追踪器 (SectorTracker)
- [x] 融资融券数据类 (MarginTrading)
- [ ] A 股板块识别
- [ ] 股票名称标准化
- [ ] A 股特定指标计算

---

## MarginTrading - 融资融券数据类

提供融资融券数据获取、趋势分析和多空情绪分析功能。

### 主要方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `getMarginData(symbol, date?)` | 获取融资融券数据 | `MarginResult` |
| `getMarginTrend(symbol, days?)` | 获取融资融券趋势（N日） | `MarginTrendResult` |
| `analyzeSentiment(symbol, days?)` | 分析多空情绪 | `SentimentAnalysisResult` |

### 数据结构

```typescript
interface MarginData {
  tsCode: string;
  tradeDate: string;
  marginBalance: number;   // 融资余额(万元)
  marginBuy: number;       // 融资买入额(万元)
  marginRepay: number;     // 融资偿还额(万元)
  shortBalance: number;    // 融券余额(万元)
  shortSell: number;       // 融券卖出量(手)
  shortCover: number;      // 融券偿还量(手)
  marginRatio: number;     // 融资融券余额比
}

interface MarginTrendResult {
  success: boolean;
  data?: MarginData[];
  trend?: {
    marginBalanceChange: number;
    marginBalanceChangeRate: number;
    shortBalanceChange: number;
    shortBalanceChangeRate: number;
    sentiment: 'bullish' | 'bearish' | 'neutral';
  };
}
```

### 使用示例

```typescript
import { MarginTrading } from '@/lib/data-sources/astock';

const margin = new MarginTrading(tushare);

// 获取融资融券数据
const result = await margin.getMarginData('600519.SH');

// 获取融资融券趋势
const trend = await margin.getMarginTrend('600519.SH', 5);

// 分析多空情绪
const sentiment = await margin.analyzeSentiment('600519.SH', 5);
console.log(sentiment.data?.sentiment); // 'bullish' | 'bearish' | 'neutral'
```


<claude-mem-context>
# Recent Activity

<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->

*No recent activity*
</claude-mem-context>