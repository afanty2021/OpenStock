# A 股功能扩展 - 第一阶段设计文档

**项目**: OpenStock
**日期**: 2026-02-22
**版本**: 1.0
**状态**: 已批准

---

## 📋 目录

1. [概述](#概述)
2. [需求分析](#需求分析)
3. [架构设计](#架构设计)
4. [模块详细设计](#模块详细设计)
5. [数据流设计](#数据流设计)
6. [错误处理](#错误处理)
7. [测试策略](#测试策略)
8. [实施计划](#实施计划)

---

## 概述

### 背景

OpenStock 项目已有多数据源聚合系统的基础设施，包括 Finnhub、Tushare、Alpha Vantage 等数据源适配器。为了更好地服务 A 股用户，需要针对 A 股市场的特殊性进行功能扩展。

### 第一阶段目标

完善 A 股数据基础，实现以下核心功能：

1. **Tushare 数据源完整集成** - 补充 A 股特色数据接口
2. **A 股代码格式标准化** - 完善代码识别、市场类型检测
3. **涨跌停检测与显示** - 完整的涨跌停状态检测和预测
4. **交易时间适配** - 支持 A 股交易时段、休市检测和日历管理

### 设计原则

- **复用现有架构** - 扩展而非重建，保持一致性
- **独立模块设计** - 每个功能独立成模块，便于测试
- **渐进式集成** - 可以逐个完成并测试，不阻塞其他功能

---

## 需求分析

### 功能需求

| 需求ID | 描述 | 优先级 |
|--------|------|--------|
| F1 | Tushare A 股特色数据接口 | P0 |
| F2 | A 股代码格式标准化与识别 | P0 |
| F3 | 涨跌停状态检测 | P0 |
| F4 | 涨跌停预测功能 | P1 |
| F5 | A 股交易时段状态显示 | P0 |
| F6 | 集合竞价支持 | P1 |
| F7 | 节假日休市检测 | P1 |

### 非功能需求

| 需求ID | 指标 | 验证方法 |
|--------|------|----------|
| N1 | API 请求优化 | 非交易时段暂停请求 |
| N2 | 数据准确性 | 代码识别准确率 100% |
| N3 | 响应时间 | P95 < 2s |
| N4 | 测试覆盖率 | > 80% |

---

## 架构设计

### 整体架构

```
现有基础 (已完成)
├── BaseDataSource 抽象类
├── DataAggregator 聚合器
├── CacheManager 缓存
└── StockCodeValidator 代码验证器

第一阶段扩展 (新增)
├── TushareSource 完善实现
│   └── 补充龙虎榜、资金流向等 A 股特色数据
├── AStockCodeUtil (新增)
│   └── 扩展代码验证、市场类型检测、板块识别
├── LimitDetector (新增)
│   └── 涨跌停检测、预测、状态判断
└── TradingCalendar (新增)
    └── A 股交易时间、休市日历、时段状态
```

### 目录结构

```
lib/data-sources/
├── astock/                    # A 股专用模块 (新增)
│   ├── index.ts
│   ├── code-util.ts           # 代码格式标准化
│   ├── limit-detector.ts      # 涨跌停检测
│   ├── trading-calendar.ts    # 交易日历
│   └── scheduler.ts           # 交易时段感知调度器
├── sources/
│   └── tushare.ts             # 扩展 A 股接口
└── types.ts                   # 扩展 A 股类型

components/astock/             # A 股 UI 组件 (新增)
├── index.ts
├── LimitBadge.tsx             # 涨跌停徽章
└── TradingStatusBar.tsx       # 交易状态栏
```

---

## 模块详细设计

### 1. AStockCodeUtil - 代码格式标准化

**职责：** A 股代码识别、格式转换、市场类型检测

**关键方法：**

```typescript
export class AStockCodeUtil {
  /**
   * 精确的 A 股代码模式匹配
   */
  private static readonly PATTERNS = {
    // 上海主板：600xxx, 601xxx, 603xxx, 605xxx
    SH_MAIN: /^60[015]\d{4}$/,
    // 上海科创板：688xxx, 689xxx
    SH_STAR: /^68[89]\d{4}$/,
    // 深圳主板：000xxx, 001xxx
    SZ_MAIN: /^00[01]\d{4}$/,
    // 深圳创业板：300xxx, 301xxx
    SZ_GEM: /^30[01]\d{4}$/,
    // 北京证券交易所：8xxxxx, 4xxxxx
    BSE: /^[48]\d{5}$/,
  };

  /**
   * 获取股票市场类型
   */
  static getMarketType(symbol: string): MarketType {
    // 返回: 'SH_MAIN', 'SH_STAR', 'SZ_MAIN', 'SZ_GEM', 'BSE'
  }

  /**
   * 获取涨跌停限制比例
   */
  static getLimitPct(symbol: string, name?: string): number {
    // 主板 10%, 科创板/创业板 20%, 北交所 30%
    // ST 股票 5% (根据股票名称判断)
  }

  /**
   * 代码格式标准化
   * 支持多种输入格式：600519、600519.SH、600519.SS
   */
  static normalize(symbol: string): string {
    // 统一转换为 600519.SH 格式
    // 处理 Finnhub (.SS) ↔ Tushare (.SH) 格式差异
  }

  /**
   * 判断是否为 A 股代码
   */
  static isAStock(symbol: string): boolean {
    // 检查是否匹配任何 A 股模式
  }
}
```

**市场类型枚举：**

```typescript
enum MarketType {
  SH_MAIN = 'SH_MAIN',       // 上海主板
  SH_STAR = 'SH_STAR',       // 上海科创板
  SZ_MAIN = 'SZ_MAIN',       // 深圳主板
  SZ_GEM = 'SZ_GEM',         // 深圳创业板
  BSE = 'BSE',              // 北京证券交易所
}
```

### 2. TushareSource - A 股数据扩展

**扩展接口：**

```typescript
export class TushareSource extends BaseDataSource {
  /**
   * 获取龙虎榜数据
   * 接口：top_list
   */
  async getTopList(date?: string): Promise<TopListData[]>;

  /**
   * 获取资金流向数据
   * 接口：moneyflow
   */
  async getMoneyFlow(symbol: string): Promise<MoneyFlowData>;

  /**
   * 获取每日指标
   * 接口：daily_basic (PE、PB、换手率等)
   */
  async getDailyBasic(symbol: string): Promise<DailyBasicData>;

  /**
   * 获取板块资金流向
   * 接口：moneyflow_hsgt
   */
  async getBlockMoneyFlow(): Promise<BlockMoneyFlowData[]>;
}
```

**新增类型定义：**

```typescript
/**
 * A 股增强报价数据
 */
export interface AStockQuoteData extends QuoteData {
  // 涨跌停相关
  limitStatus?: 'UPPER' | 'LOWER' | 'NORMAL';
  isUpperLimit?: boolean;
  isLowerLimit?: boolean;

  // A 股特有指标
  pe_ttm?: number;        // 市盈率 TTM
  pb?: number;            // 市净率
  turnover?: number;      // 换手率
  volume_ratio?: number;  // 量比
  total_mv?: number;      // 总市值
  circ_mv?: number;       // 流通市值
}

/**
 * 龙虎榜数据
 */
export interface TopListData {
  ts_code: string;        // 股票代码
  name: string;           // 股票名称
  reason: string;         // 上榜理由
  buy_amount: number;     // 买入金额
  sell_amount: number;    // 卖出金额
  net_amount: number;     // 净买入金额
}

/**
 * 资金流向数据
 */
export interface MoneyFlowData {
  ts_code: string;
  buy_elg_vol?: number;   // 买入量
  sell_elg_vol?: number;  // 卖出量
  buy_lg_vol?: number;    // 大单买入
  sell_lg_vol?: number;   // 大单卖出
  net_mf_vol?: number;    // 净流入
}

/**
 * 每日指标数据
 */
export interface DailyBasicData {
  ts_code: string;
  pe_ttm?: number;        // 市盈率 TTM
  pb?: number;            // 市净率
  ps_ttm?: number;        // 市销率
  pcf_ratio?: number;     // 市现率
  turnover?: number;      // 换手率
  volume_ratio?: number;  // 量比
  total_mv?: number;      // 总市值
  circ_mv?: number;       // 流通市值
}
```

### 3. LimitDetector - 涨跌停检测

**职责：** 检测涨跌停状态、预测距离涨跌停的空间

**关键方法：**

```typescript
export class LimitDetector {
  /**
   * 检测当前涨跌停状态
   */
  static detectLimitStatus(quote: QuoteData): LimitStatus {
    const limitPct = AStockCodeUtil.getLimitPct(quote.symbol);
    const changePct = quote.dp;

    // 考虑浮点数误差，使用 0.5% 容差判断
    const tolerance = limitPct * 0.005;

    if (changePct >= limitPct - tolerance) {
      return 'UPPER';
    } else if (changePct <= -limitPct + tolerance) {
      return 'LOWER';
    }
    return 'NORMAL';
  }

  /**
   * 预测距离涨跌停的距离
   */
  static predictLimitDistance(quote: QuoteData): LimitPrediction {
    const limitPct = AStockCodeUtil.getLimitPct(quote.symbol);
    const currentPct = quote.dp;

    const upperDistance = limitPct - currentPct;
    const lowerDistance = limitPct + currentPct;

    // 计算还需涨跌多少金额到达涨跌停
    const upperPrice = quote.pc * (1 + limitPct / 100);
    const lowerPrice = quote.pc * (1 - limitPct / 100);

    return {
      toUpper: {
        pct: upperDistance,
        price: upperPrice - quote.c,
        reachable: upperDistance > 0 && upperDistance < limitPct * 0.3,
      },
      toLower: {
        pct: lowerDistance,
        price: quote.c - lowerPrice,
        reachable: lowerDistance > 0 && lowerDistance < limitPct * 0.3,
      },
    };
  }

  /**
   * 判断是否接近涨跌停
   * 用于触发预警
   */
  static isNearLimit(quote: QuoteData, threshold: number = 0.7): boolean {
    const prediction = this.predictLimitDistance(quote);
    return prediction.toUpper.reachable || prediction.toLower.reachable;
  }
}
```

**类型定义：**

```typescript
type LimitStatus = 'UPPER' | 'LOWER' | 'NORMAL';

interface LimitPrediction {
  toUpper: {
    pct: number;        // 距涨停百分比
    price: number;      // 距涨停金额
    reachable: boolean; // 是否可触及 (当日剩余时间)
  };
  toLower: {
    pct: number;
    price: number;
    reachable: boolean;
  };
}
```

### 4. TradingCalendar - 交易日历

**职责：** 管理交易时间、检测休市状态、判断交易日

**关键方法：**

```typescript
export class TradingCalendar {
  /**
   * 获取当前交易时段状态
   */
  static getTradingStatus(date: Date = new Date()): TradingStatus {
    const hour = date.getHours();
    const minute = date.getMinutes();
    const currentTime = hour * 60 + minute;

    // A 股交易时段（分钟数）
    const SESSIONS = {
      PRE_MARKET: { start: 9*60 + 15, end: 9*60 + 25 },   // 集合竞价
      MORNING: { start: 9*60 + 30, end: 11*60 + 30 },      // 上午
      AFTERNOON: { start: 13*60, end: 15*60 },             // 下午
    };

    // 判断当前时段
    if (this.isHoliday(date)) {
      return { status: 'HOLIDAY', nextOpen: this.getNextTradingDay() };
    }

    if (currentTime >= SESSIONS.PRE_MARKET.start &&
        currentTime <= SESSIONS.PRE_MARKET.end) {
      return { status: 'PRE_MARKET', note: '集合竞价中' };
    }

    if (currentTime >= SESSIONS.MORNING.start &&
        currentTime <= SESSIONS.MORNING.end) {
      return { status: 'TRADING', session: 'MORNING' };
    }

    if (currentTime > SESSIONS.MORNING.end &&
        currentTime < SESSIONS.AFTERNOON.start) {
      return { status: 'LUNCH_BREAK', note: '午间休市' };
    }

    if (currentTime >= SESSIONS.AFTERNOON.start &&
        currentTime <= SESSIONS.AFTERNOON.end) {
      return { status: 'TRADING', session: 'AFTERNOON' };
    }

    return { status: 'CLOSED', note: '休市中', nextOpen: this.getNextOpen() };
  }

  /**
   * 判断是否为交易日
   * 排除：周末、法定节假日、调休补班日
   */
  static isTradingDay(date: Date): boolean {
    const day = date.getDay();
    if (day === 0 || day === 6) return false; // 周末

    // 检查是否为法定节假日（从数据库或 API 获取）
    return !this.isHoliday(date);
  }

  /**
   * 判断是否为休市日
   */
  static isHoliday(date: Date): boolean {
    // 实现方式：
    // 1. 内置节假日规则（春节、国庆等固定规则）
    // 2. 或调用 Tushare 接口：trade_cal(exchange='SSE')
    return this.checkHolidayFromAPI(date);
  }

  /**
   * 获取下一个交易日
   */
  static getNextTradingDay(date: Date = new Date()): Date {
    // 从 Tushare 获取日历，或本地计算
  }

  /**
   * 获取下一个开盘时间
   */
  static getNextOpen(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 返回次日 9:30
    tomorrow.setHours(9, 30, 0, 0);
    return tomorrow;
  }
}
```

**类型定义：**

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

### 5. TradingAwareScheduler - 交易时段感知调度器

**职责：** 根据交易时段智能调度 API 请求，节省配额

**关键方法：**

```typescript
export class TradingAwareScheduler {
  /**
   * 判断是否应该发起 API 请求
   */
  static shouldRequest(): boolean {
    const status = TradingCalendar.getTradingStatus();

    // 在以下情况暂停请求，节省配额：
    const SKIP_REQUEST = [
      'HOLIDAY',        // 法定节假日
      'CLOSED',         // 非交易时段
      'LUNCH_BREAK',    // 午间休市
    ];

    return !SKIP_REQUEST.includes(status.status);
  }

  /**
   * 获取推荐的请求频率
   */
  static getRecommendedInterval(): number {
    const status = TradingCalendar.getTradingStatus();

    const INTERVALS = {
      'TRADING': 3000,      // 交易中：3 秒
      'PRE_MARKET': 5000,   // 集合竞价：5 秒
      'LUNCH_BREAK': 60000, // 午休：1 分钟
      'CLOSED': 300000,    // 休市：5 分钟
      'HOLIDAY': 600000,   // 节假日：10 分钟
    };

    return INTERVALS[status.status] || 30000;
  }

  /**
   * 智能延迟函数
   * 根据交易时段动态调整延迟时间
   */
  static async smartDelay(): Promise<void> {
    const interval = this.getRecommendedInterval();
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}
```

---

## 数据流设计

### 完整数据流

```
用户请求
    │
    ▼
TradingAwareScheduler.shouldRequest()
    │
    ├─→ 否 → 返回缓存数据 (即使过期)
    │
    └─→ 是 → 继续
        │
        ▼
AStockCodeUtil.normalize(symbol)
    │
    ▼
DataAggregator.getQuote(symbol)
    │
    ├─→ 检查 L1 缓存 (React Cache, 60s)
    │
    ├─→ 并行请求所有数据源
    │   │
    │   ├─→ Tushare API (A 股优先)
    │   │   ├─ daily (基础行情)
    │   │   ├─ daily_basic (PE/PB/换手率)
    │   │   └─ top_list (龙虎榜)
    │   │
    │   ├─→ Finnhub API (备份)
    │   │
    │   └─→ Alpha Vantage API (备份)
    │
    ├─→ 数据验证与融合
    │
    └─→ LimitDetector.detectLimitStatus()
        │
        ▼
    CacheManager.set() (写入缓存 60s)
        │
        ▼
    返回增强的 QuoteData (含 A 股字段)
        │
        ▼
    UI 组件渲染
    ├─→ LimitBadge (涨跌停徽章)
    ├─→ TradingStatusBar (交易状态)
    └─→ StockQuote (报价显示)
```

### 缓存策略

| 缓存层级 | 类型 | TTL | A 股优化 |
|---------|------|-----|---------|
| L1 | React Cache | 60s | 交易中 30s |
| L2 | Redis/Upstash | 5min | 非交易时延长 |

---

## 错误处理

### 错误分类

```typescript
enum AStockErrorType {
  CREDIT_INSUFFICIENT = 'CREDIT_INSUFFICIENT',   // 积分不足
  NON_TRADING_DAY = 'NON_TRADING_DAY',           // 非交易日
  INVALID_SYMBOL = 'INVALID_SYMBOL',             // 无效代码
  API_TIMEOUT = 'API_TIMEOUT',                   // API 超时
  UNKNOWN = 'UNKNOWN',                           // 未知错误
}
```

### 降级策略

```typescript
export class AStockErrorHandler {
  /**
   * 处理 Tushare API 错误
   */
  static handleTushareError(error: any): never {
    if (error.code === -4015) {
      throw new DataSourceError(
        'TUSHARE_CREDIT_INSUFFICIENT',
        'Tushare 积分不足，请检查账户积分'
      );
    }

    if (error.code === -2102) {
      // 非交易日 - 返回空数据或最后一个交易日数据
      return;
    }

    throw error;
  }

  /**
   * 获取降级数据策略
   * L1: 过期缓存 → L2: 默认值
   */
  static getFallbackData(symbol: string): QuoteData | null {
    // L1: 返回缓存数据（即使过期）
    const cached = CacheManager.get(`quote:${symbol}`, { allowExpired: true });
    if (cached) {
      return { ...cached, _fallback: true, _warning: '显示过期数据' };
    }

    // L2: 返回默认值
    return {
      symbol,
      c: 0,
      d: 0,
      dp: 0,
      h: 0,
      l: 0,
      o: 0,
      pc: 0,
      t: Date.now() / 1000,
      _source: 'fallback',
      _fallback: true,
      _error: '无法获取数据，请稍后重试',
    };
  }
}
```

---

## 测试策略

### 单元测试

**AStockCodeUtil 测试：**

```typescript
describe('AStockCodeUtil', () => {
  test('应正确识别主板股票代码', () => {
    expect(AStockCodeUtil.getMarketType('600519.SH')).toBe('SH_MAIN');
    expect(AStockCodeUtil.getLimitPct('600519.SH')).toBe(10);
  });

  test('应正确识别科创板股票', () => {
    expect(AStockCodeUtil.getMarketType('688001.SH')).toBe('SH_STAR');
    expect(AStockCodeUtil.getLimitPct('688001.SH')).toBe(20);
  });

  test('应正确识别创业板股票', () => {
    expect(AStockCodeUtil.getMarketType('300001.SZ')).toBe('SZ_GEM');
    expect(AStockCodeUtil.getLimitPct('300001.SZ')).toBe(20);
  });

  test('应正确识别 ST 股票', () => {
    expect(AStockCodeUtil.getLimitPct('600000.SH', 'ST新华')).toBe(5);
  });

  test('应正确标准化代码格式', () => {
    expect(AStockCodeUtil.normalize('600519')).toBe('600519.SH');
    expect(AStockCodeUtil.normalize('600519.SS')).toBe('600519.SH');
  });
});
```

**LimitDetector 测试：**

```typescript
describe('LimitDetector', () => {
  test('应正确检测涨停状态', () => {
    const quote: QuoteData = {
      symbol: '600519.SH',
      c: 110, pc: 100, dp: 10,
      h: 110, l: 100, o: 100, t: Date.now()/1000,
      _source: 'test',
    };
    expect(LimitDetector.detectLimitStatus(quote)).toBe('UPPER');
  });

  test('应正确预测涨跌停距离', () => {
    const prediction = LimitDetector.predictLimitDistance({
      symbol: '600519.SH',
      c: 108, pc: 100, dp: 8,
      h: 108, l: 100, o: 100, t: Date.now()/1000,
      _source: 'test',
    });
    expect(prediction.toUpper.pct).toBeCloseTo(2, 1);
  });
});
```

**TradingCalendar 测试：**

```typescript
describe('TradingCalendar', () => {
  test('应正确判断午间休市', () => {
    const lunchTime = new Date('2026-02-22T12:00:00+08:00');
    const status = TradingCalendar.getTradingStatus(lunchTime);
    expect(status.status).toBe('LUNCH_BREAK');
  });

  test('应正确判断集合竞价时段', () => {
    const preMarket = new Date('2026-02-22T09:20:00+08:00');
    const status = TradingCalendar.getTradingStatus(preMarket);
    expect(status.status).toBe('PRE_MARKET');
  });
});
```

### 集成测试

```typescript
describe('A 股数据集成测试', () => {
  test('应获取完整的 A 股报价数据', async () => {
    const quote = await dataAggregator.getQuote('600519.SH');

    expect(quote.symbol).toBe('600519.SH');
    expect(quote.c).toBeGreaterThan(0);
    expect(quote.limitStatus).toBeDefined();
    expect(quote.pe_ttm).toBeDefined();
  });

  test('应在休市时段返回缓存数据', async () => {
    const quote = await dataAggregator.getQuote('600519.SH');
    expect(quote._fallback).toBeDefined();
  });
});
```

---

## 实施计划

### 时间表 (1-2 周)

| 任务 | 工作日 | 产出 |
|------|-------|------|
| **1. Tushase 完善** | 3-4 天 | 完整的 A 股数据接口 |
| **2. 代码标准化** | 1-2 天 | AStockCodeUtil 模块 |
| **3. 涨跌停检测** | 2-3 天 | LimitDetector + UI 组件 |
| **4. 交易时间适配** | 1-2 天 | TradingCalendar + 调度器 |
| **5. 测试与优化** | 1-2 天 | 测试覆盖、性能优化 |

### 交付物

**新增文件：**
```
lib/data-sources/astock/
├── index.ts
├── code-util.ts
├── limit-detector.ts
├── trading-calendar.ts
└── scheduler.ts
```

**扩展文件：**
```
lib/data-sources/sources/tushare.ts  # 添加 A 股接口
lib/data-sources/types.ts            # 扩展 A 股类型
```

**UI 组件：**
```
components/astock/
├── index.ts
├── LimitBadge.tsx
└── TradingStatusBar.tsx
```

**文档：**
```
docs/plans/2026-02-22-astock-phase1-design.md  # 本文档
lib/data-sources/astock/CLAUDE.md             # 模块文档
```

### 环境变量

```bash
# .env 新增配置（如未配置）

# Tushare API（已配置）
TUSHARE_API_TOKEN=your_token_here

# A 股功能配置
ASTOCK_LIMIT_PREDICTION=true    # 启用涨跌停预测
ASTOCK_TRADING_AWARE_REQUEST=true  # 启用交易时段感知请求
```

---

## 附录

### A. 交易所配置

```typescript
const EXCHANGE_CONFIG = {
  'SH': {
    name: '上海证券交易所',
    en: 'Shanghai Stock Exchange',
    timezone: 'Asia/Shanghai',
    tradingHours: ['09:30-11:30', '13:00-15:00'],
    preMarket: '09:15-09:25',
  },
  'SZ': {
    name: '深圳证券交易所',
    en: 'Shenzhen Stock Exchange',
    timezone: 'Asia/Shanghai',
    tradingHours: ['09:30-11:30', '13:00-15:00'],
    preMarket: '09:15-09:25',
  },
  'BSE': {
    name: '北京证券交易所',
    en: 'Beijing Stock Exchange',
    timezone: 'Asia/Shanghai',
    tradingHours: ['09:30-11:30', '13:00-15:00'],
    preMarket: '09:15-09:25',
  },
};
```

### B. A 股涨跌停规则

| 市场类型 | 涨跌停限制 | 说明 |
|---------|-----------|------|
| 主板 (SH/SZ) | ±10% | 601xxx, 000xxx 等 |
| 科创板 (SH_STAR) | ±20% | 688xxx, 689xxx |
| 创业板 (SZ_GEM) | ±20% | 300xxx, 301xxx |
| 北交所 (BSE) | ±30% | 8xxxxx, 4xxxxx |
| ST 股票 | ±5% | 名称含 ST/*ST/S*ST |

### C. Tushare API 参考

**文档**: https://tushare.pro/document/2

**主要接口**:
- `daily` - 日线行情
- `daily_basic` - 每日指标
- `top_list` - 龙虎榜
- `moneyflow` - 个股资金流向
- `trade_cal` - 交易日历

---

**文档版本**: 1.0
**最后更新**: 2026-02-22
**作者**: AI Design Assistant
