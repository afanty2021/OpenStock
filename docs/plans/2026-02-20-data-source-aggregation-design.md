# 多数据源聚合系统设计文档

**项目**: OpenStock
**日期**: 2026-02-20
**版本**: 1.1 (根据审查意见更新)
**状态**: 设计阶段 (已批准)

---

## 📋 目录

1. [概述](#概述)
2. [设计目标](#设计目标)
3. [架构设计](#架构设计)
4. [接口定义](#接口定义)
5. [数据源实现](#数据源实现)
6. [数据融合策略](#数据融合策略)
7. [数据流设计](#数据流设计)
8. [错误处理](#错误处理)
9. [降级策略](#降级策略) 🆕
10. [缓存策略](#缓存策略)
11. [实现计划](#实现计划)
12. [风险评估](#风险评估)
13. [变更记录](#变更记录) 🆕

---

## 概述

### 背景

OpenStock 目前使用单一的 Finnhub API 作为数据源，存在以下问题：
- **API 限制**：Finnhub 免费计划限制 60 次/分钟
- **单点故障**：API 故障导致整个系统不可用
- **数据覆盖不足**：中国市场（A 股）数据不够详细
- **财务数据缺失**：缺少深度的财务报表数据

### 解决方案

构建**多数据源聚合系统**，集成以下数据源：
- **Finnhub**：美股和国际市场（现有）
- **Tushare**：A 股和港股深度数据（新增）
- **Alpha Vantage**：美股财务数据和备份源（新增）

### 核心特性

1. **数据融合**：并行调用多个数据源，融合结果提高准确性
2. **智能路由**：按市场自动选择最佳数据源
3. **故障转移**：自动切换到备用数据源
4. **质量评分**：基于完整性、新鲜度、可靠性的评分系统

---

## 设计目标

### 功能目标

| 目标 | 描述 | 优先级 |
|------|------|--------|
| 基础行情数据 | 支持美股、A 股、港股的实时报价 | P0 |
| 公司资料 | 公司名称、logo、交易所等基本信息 | P0 |
| 财务报表 | 资产负债表、利润表、现金流表 | P1 |
| 市场新闻 | 相关新闻聚合 | P2 |
| 技术指标 | MACD、KDJ、RSI 等 | P3 |

### 非功能目标

| 目标 | 指标 | 验证方法 |
|------|------|----------|
| 可用性 | 99.5% | 监控统计 |
| 响应时间 | P95 < 2s | 性能测试 |
| 数据准确性 | 价格差异 < 1% | 数据对比 |
| 可扩展性 | 支持新增数据源 < 1天 | 代码审查 |

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                   应用层 (Application Layer)             │
│  searchStocks, getQuote, getCompanyProfile, getNews     │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              数据源聚合器层 (Aggregator Layer)           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  路由选择器   │→ │  并行请求器   │→ │  数据融合器   │  │
│  │  Router      │  │  Parallel     │  │  Fusion       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │           质量评分系统 (Quality Scoring)           │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Finnhub     │    │  Tushare     │    │Alpha Vantage │
│  Source      │    │  Source      │    │  Source      │
└──────────────┘    └──────────────┘    └──────────────┘
```

### 分层说明

#### 1. 应用层 (Application Layer)
- 保持现有 API 接口不变
- 通过聚合器访问数据源
- 对上层透明，无需修改调用代码

#### 2. 聚合器层 (Aggregator Layer)
- **路由选择器**：根据股票代码选择合适的数据源
- **并行请求器**：同时调用多个数据源，提高响应速度
- **数据融合器**：合并多个数据源的结果，提高准确性
- **质量评分**：对每个数据源的结果进行质量评估

#### 3. 数据源层 (Source Layer)
- 每个数据源实现统一的接口
- 负责与外部 API 的具体交互
- 处理数据格式转换

---

## 接口定义

### 核心接口

```typescript
/**
 * 股票数据源接口
 * 所有数据源必须实现此接口
 */
export interface StockDataSource {
  /** 数据源名称 */
  name: string;

  /** 数据源优先级（数字越小优先级越高） */
  priority: number;

  /** 数据源能力 */
  capabilities: DataSourceCapabilities;

  /**
   * 判断是否支持该股票代码
   * @param symbol 股票代码（如 AAPL, 600519.SS）
   */
  supportsSymbol(symbol: string): boolean;

  /**
   * 获取股票报价
   * @param symbol 股票代码
   * @returns 带质量分数的报价数据
   */
  getQuote(symbol: string): Promise<DataSourceResult<QuoteData>>;

  /**
   * 获取公司资料
   * @param symbol 股票代码
   * @returns 带质量分数的公司资料
   */
  getProfile(symbol: string): Promise<DataSourceResult<ProfileData>>;

  /**
   * 搜索股票
   * @param query 搜索关键词
   * @returns 带质量分数的搜索结果
   */
  searchStocks(query: string): Promise<DataSourceResult<SearchResult[]>>;

  /**
   * 获取财务数据（可选）
   * @param symbol 股票代码
   * @returns 带质量分数的财务数据
   */
  getFinancials?(symbol: string): Promise<DataSourceResult<FinancialData>>;
}

/**
 * 数据源能力定义
 */
export interface DataSourceCapabilities {
  /** 是否支持实时报价 */
  quote: boolean;

  /** 是否支持公司资料 */
  profile: boolean;

  /** 是否支持新闻数据 */
  news: boolean;

  /** 是否支持财务数据 */
  financials: boolean;

  /** 支持的市场 */
  markets: ('US' | 'CN' | 'HK' | 'GLOBAL')[];
}

/**
 * 带质量分数的数据结果
 */
export interface DataSourceResult<T> {
  /** 数据内容 */
  data: T;

  /** 质量评分 */
  quality: QualityScore;

  /** 时间戳 */
  timestamp: number;
}

/**
 * 质量评分
 */
export interface QualityScore {
  /** 总分 (0-100) */
  total: number;

  /** 数据完整性 (0-100) */
  completeness: number;

  /** 数据新鲜度 (0-100) */
  freshness: number;

  /** 数据可靠性 (0-100，基于历史成功率) */
  reliability: number;
}
```

### 数据类型定义

```typescript
/**
 * 股票报价数据
 */
export interface QuoteData {
  /** 股票代码 */
  symbol: string;

  /** 当前价格 */
  c: number;

  /** 涨跌额 */
  d: number;

  /** 涨跌幅 (%) */
  dp: number;

  /** 最高价 */
  h: number;

  /** 最低价 */
  l: number;

  /** 开盘价 */
  o: number;

  /** 前收盘价 */
  pc: number;

  /** 时间戳 */
  t: number;

  /** 数据来源 */
  _source: string;

  /** 融合数据时参与的数据源数量 */
  _sourceCount?: number;

  /** 各数据源的质量信息（仅融合数据） */
  _sources?: Array<{ name: string; quality: number }>;
}

/**
 * 公司资料数据
 */
export interface ProfileData {
  /** 股票代码 */
  symbol: string;

  /** 公司名称 */
  name: string;

  /** 交易所 */
  exchange: string;

  /** 行业 */
  industry?: string;

  /** 市值 */
  marketCap?: number;

  /** Logo URL */
  logo?: string;

  /** 网站 */
  website?: string;

  /** 描述 */
  description?: string;

  /** 数据来源 */
  _source: string;
}

/**
 * 财务数据
 */
export interface FinancialData {
  /** 股票代码 */
  symbol: string;

  /** 报告期 */
  period: string;

  /** 营业收入 */
  revenue?: number;

  /** 净利润 */
  netIncome?: number;

  /** 总资产 */
  totalAssets?: number;

  /** 总负债 */
  totalLiabilities?: number;

  /** 每股收益 */
  eps?: number;

  /** 净资产收益率 */
  roe?: number;

  /** 数据来源 */
  _source: string;
}
```

---

## 数据源实现

### Finnhub 数据源

**职责**：美股和国际市场的主要数据源

**特点**：
- 实时数据，延迟低
- 新闻数据支持
- 覆盖全球市场

**API 限制**：60 次/分钟（免费版）

```typescript
export class FinnhubSource extends BaseDataSource {
  name = 'finnhub';
  priority = 1;  // 美股首选

  capabilities = {
    quote: true,
    profile: true,
    news: true,
    financials: false,
    markets: ['US', 'GLOBAL'],
  };

  private baseUrl = 'https://finnhub.io/api/v1';
  private apiKey: string;

  constructor() {
    super();
    this.apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || '';
  }

  supportsSymbol(symbol: string): boolean {
    // 不支持中国股票
    return !this.isChineseStock(symbol);
  }

  // ... 实现细节
}
```

### Tushare 数据源

**职责**：A 股和港股的主要数据源，财务数据的主要来源

**特点**：
- A 股数据最全面
- 财务数据丰富（资产负债表、利润表、现金流表）
- 支持股东数据、龙虎榜等特色数据

**API 限制**：
- 免积分：120 次/分钟
- 有积分：500-2000 次/分钟

**Tushare API 数据格式**：
```typescript
// Tushare 返回格式（数组形式）
interface TushareResponse<T = any> {
  code: number;           // 0 表示成功
  msg: string;            // 错误信息
  data: {
    fields: string[];     // 字段名数组
    items: T[][];         // 数据数组（每行是一个数组）
  };
}

// 数据转换工具函数
function transformTushareData<T extends Record<string, any>>(
  response: TushareResponse
): T[] {
  const { fields, items } = response.data;
  return items.map(item =>
    fields.reduce((obj, field, i) => {
      obj[field] = item[i];
      return obj;
    }, {} as T)
  );
}
```

**A 股代码格式处理**：
```typescript
// 精确的 A 股代码判断
class StockCodeValidator {
  // 上海：600xxx, 601xxx, 603xxx, 605xxx, 688xxx(科创板)
  private static SH_PATTERN = /^6(0|1|3|5|8)\d{4}\.(SS|SH)$/i;

  // 深圳：000xxx, 001xxx, 002xxx, 003xxx, 300xxx(创业板), 301xxx
  private static SZ_PATTERN = /^(0|3)\d{4}\.(SZ|se)$/i;

  // 港股：0xxx, 1xxx, 2xxx, 3xxx, 4xxx, 5xxx, 6xxx, 7xxx, 8xxx
  private static HK_PATTERN = /^[0-8]\d{3,4}\.HK$/i;

  static isAStock(symbol: string): boolean {
    return this.SH_PATTERN.test(symbol) || this.SZ_PATTERN.test(symbol);
  }

  static isHKStock(symbol: string): boolean {
    return this.HK_PATTERN.test(symbol);
  }

  // Finnhub → Tushare 代码转换
  static toTushareCode(symbol: string): string {
    if (symbol.endsWith('.SS')) return symbol.replace(/\.SS$/i, '.SH');
    if (symbol.endsWith('.se')) return symbol.replace(/\.se$/i, '.SZ');
    return symbol.toUpperCase();
  }

  // Tushare → Finnhub 代码转换
  static toFinnhubCode(symbol: string): string {
    if (symbol.endsWith('.SH')) return symbol.replace(/\.SH$/i, '.SS');
    if (symbol.endsWith('.SZ')) return symbol.replace(/\.SZ$/i, '.se');
    return symbol;
  }
}
```

```typescript
export class TushareSource extends BaseDataSource {
  name = 'tushare';
  priority = 1;  // A 股首选

  capabilities = {
    quote: true,
    profile: true,
    news: false,
    financials: true,  // 强项
    markets: ['CN', 'HK'],
  };

  private apiUrl = 'http://api.tushare.pro';
  private token: string;

  constructor() {
    super();
    this.token = process.env.TUSHARE_API_TOKEN || '';
  }

  supportsSymbol(symbol: string): boolean {
    // 支持 A 股和港股
    return StockCodeValidator.isAStock(symbol) ||
           StockCodeValidator.isHKStock(symbol);
  }

  async getQuote(symbol: string): Promise<DataSourceResult<QuoteData>> {
    const tsCode = StockCodeValidator.toTushareCode(symbol);

    const data = await this.fetchWithRetry(async () => {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'daily',
          token: this.token,
          params: {
            ts_code: tsCode,
            trade_date: this.getLatestTradeDate(),
          },
          fields: 'ts_code,trade_date,open,high,low,close,pre_close,vol,amount'
        })
      });

      const result: TushareResponse = await response.json();

      if (result.code !== 0) {
        throw new Error(result.msg || 'Tushare API error');
      }

      // 转换数组格式为对象
      const records = transformTushareData<any>(result);
      if (records.length === 0) {
        throw new Error('No data available');
      }

      return records[0];
    });

    return {
      data: this.normalizeQuote(data, symbol),
      quality: this.createQualityScore(data),
      timestamp: Date.now(),
    };
  }

  // ... 其他实现细节
}
```

### Alpha Vantage 数据源

**职责**：美股的备用数据源，财务数据补充

**特点**：
- 免费版无限制调用（有速率限制）
- 财务数据支持
- 数据有一定延迟

**API 限制**：5 次/分钟（免费版），25 次/天

```typescript
export class AlphaVantageSource extends BaseDataSource {
  name = 'alphaVantage';
  priority = 2;  // 备用源

  capabilities = {
    quote: true,
    profile: true,
    news: false,
    financials: true,
    markets: ['US'],
  };

  private baseUrl = 'https://www.alphavantage.co/query';
  private apiKey: string;

  constructor() {
    super();
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
  }

  supportsSymbol(symbol: string): boolean {
    // 主要支持美股
    return /^[A-Za-z]+$/.test(symbol);
  }

  // ... 实现细节
}
```

---

## 数据融合策略

### 质量评分系统（增强版）

```typescript
/**
 * 增强的质量评分器
 * 使用加权算法评估数据质量
 */
class QualityScorer {
  /**
   * 计算数据完整性分数
   * 根据字段的重要性和缺失情况计算
   */
  scoreCompleteness(data: any): number {
    let score = 0;
    let weight = 0;

    // 必需字段（高权重 3）
    const required: Record<string, number> = {
      c: 3,   // 当前价格（必需）
      d: 2,   // 涨跌额
      dp: 2,  // 涨跌幅
    };

    // 可选字段（低权重 1）
    const optional: Record<string, number> = {
      h: 1,   // 最高价
      l: 1,   // 最低价
      o: 1,   // 开盘价
      pc: 1,  // 前收盘价
      t: 1,   // 时间戳
    };

    // 计算必需字段分数
    for (const [field, w] of Object.entries(required)) {
      weight += w;
      if (data[field] !== null && data[field] !== undefined && !isNaN(data[field])) {
        score += w;
      }
    }

    // 计算可选字段分数
    for (const [field, w] of Object.entries(optional)) {
      weight += w;
      if (data[field] !== null && data[field] !== undefined && !isNaN(data[field])) {
        score += w;
      }
    }

    return Math.round((score / weight) * 100);
  }

  /**
   * 计算数据新鲜度分数
   * 根据数据延迟时间评分
   */
  scoreFreshness(data: any): number {
    const now = Date.now() / 1000;
    const dataAge = data.t ? now - data.t : 300;  // 默认 5 分钟

    // 延迟越少，分数越高
    if (dataAge < 15) return 100;    // 15 秒内（实时）
    if (dataAge < 60) return 95;     // 1 分钟内
    if (dataAge < 300) return 85;    // 5 分钟内
    if (dataAge < 900) return 70;    // 15 分钟内
    if (dataAge < 3600) return 50;   // 1 小时内
    return 30;                       // 超过 1 小时
  }

  /**
   * 计算数据合理性分数
   * 检查数据的逻辑一致性
   */
  scoreConsistency(data: any): number {
    let score = 100;

    // 检查价格合理性
    if (data.c <= 0 || !isFinite(data.c)) score -= 50;
    if (data.h < data.l) score -= 30;  // 最高价应 >= 最低价
    if (data.c > data.h * 1.1) score -= 20;  // 当前价不应超过最高价 10%
    if (data.c < data.l * 0.9) score -= 20;  // 当前价不应低于最低价 10%

    // 检查涨跌幅合理性
    if (Math.abs(data.dp) > 20) score -= 10;  // 单日涨跌幅超过 20% 可能异常
    if (Math.abs(data.dp) > 50) score -= 20;  // 单日涨跌幅超过 50% 高度异常

    return Math.max(0, score);
  }
}
```

### 融合算法

#### 1. 价格融合

对于股票价格，采用**质量加权平均**：

```typescript
function fusePrice(results: DataSourceResult<QuoteData>[]): number {
  const totalWeight = results.reduce((sum, r) => sum + r.quality.total, 0);
  const weighted = results.reduce((sum, r) =>
    sum + r.data.c * r.quality.total, 0
  );

  return Math.round((weighted / totalWeight) * 100) / 100;
}
```

#### 2. 数据验证

在融合前进行数据验证：

```typescript
function validateQuote(data: QuoteData): boolean {
  // 价格必须大于 0
  if (data.c <= 0 || !isFinite(data.c)) return false;

  // 涨跌幅不能超过 50%（单日）
  if (Math.abs(data.dp) > 50) return false;

  // 检查价格合理性
  if (data.h < data.l) return false;  // 最高价应 >= 最低价

  return true;
}
```

#### 3. 冲突检测

当多个数据源的价格差异超过 5% 时发出警告：

```typescript
function detectPriceDiscrepancy(results: DataSourceResult<QuoteData>[]): void {
  const prices = results.map(r => r.data.c);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);

  if (maxPrice / minPrice > 1.05) {
    console.warn('[DataAggregator] Price discrepancy detected', {
      symbol: results[0].data.symbol,
      prices: results.map(r => ({
        source: r.data._source,
        price: r.data.c,
        quality: r.quality.total
      }))
    });
  }
}
```

#### 4. 财务数据融合

对于财务数据，采用**完整性优先**策略：

```typescript
function fuseFinancialData(results: DataSourceResult<FinancialData>[]): FinancialData {
  // 按完整性评分排序
  const sorted = results.sort((a, b) =>
    b.quality.completeness - a.quality.completeness
  );

  // 使用最完整的数据作为基础
  const primary = { ...sorted[0].data };

  // 用其他源补充缺失字段
  for (const result of sorted.slice(1)) {
    for (const key in result.data) {
      if (!primary[key] && result.data[key]) {
        primary[key] = result.data[key];
        primary._source = `${primary._source}+${result.data._source}`;
      }
    }
  }

  return primary;
}
```

---

## 数据流设计

### 请求流程

```
用户请求
    │
    ▼
┌─────────────────┐
│  检查 L1 缓存    │  ←── React Cache (60秒)
│  (内存缓存)      │
└────────┬────────┘
         │ 未命中
         ▼
┌─────────────────┐
│  检查 L2 缓存    │  ←── Redis/Upstash (5分钟)
│  (分布式缓存)    │
└────────┬────────┘
         │ 未命中
         ▼
┌─────────────────┐
│  数据源选择      │  ←── 根据 symbol 选择
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  并行请求        │  ←── Promise.allSettled
│  (5秒超时)       │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌──────┐  ┌──────┐
│ 成功 │  │ 失败 │
└───┬──┘  └───┬──┘
    │         │
    ▼         ▼
┌─────────────────┐
│  数据验证        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  数据融合        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  写入缓存        │
└────────┬────────┘
         │
         ▼
    返回结果
```

### 缓存策略

| 缓存层级 | 类型 | TTL | 用途 |
|---------|------|-----|------|
| L1 | React Cache | 60s | 内存缓存，快速访问 |
| L2 | Redis/Upstash | 5min | 分布式缓存，跨请求共享 |

### 代码示例

```typescript
export class DataPipeline {
  private cache: CacheManager;

  async getQuote(symbol: string): Promise<QuoteData> {
    // 阶段 1: 检查缓存
    const cached = this.cache.get(CacheManager.keys.quote(symbol));
    if (cached) {
      console.log(`[Cache] Hit for ${symbol}`);
      return cached;
    }

    // 阶段 2: 选择数据源
    const sources = this.selectSources(symbol, 'quote');

    // 阶段 3: 并行请求
    const results = await this.fetchWithTimeout(
      Promise.allSettled(
        sources.map(s => s.getQuote(symbol))
      ),
      5000
    );

    // 阶段 4: 数据验证
    const validResults = this.validateResults(results);

    // 阶段 5: 数据融合
    const fused = this.fuseData(validResults);

    // 阶段 6: 写入缓存
    this.cache.set(CacheManager.keys.quote(symbol), fused, 60);

    return fused;
  }
}
```

---

## 错误处理

### 错误分类

```typescript
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',       // 网络错误
  API_RATE_LIMIT = 'API_RATE_LIMIT',     // API 限流
  INVALID_DATA = 'INVALID_DATA',         // 无效数据
  TIMEOUT = 'TIMEOUT',                   // 超时
  UNKNOWN = 'UNKNOWN',                   // 未知错误
}

export class DataSourceError extends Error {
  constructor(
    public type: ErrorType,
    public source: string,
    message: string,
    public originalError?: any
  ) {
    super(`[${source}] ${message}`);
    this.name = 'DataSourceError';
  }
}
```

### 重试策略

使用**指数退避**算法：

| 错误类型 | 是否重试 | 最大次数 | 退避时间 |
|---------|---------|---------|----------|
| NETWORK_ERROR | 是 | 3 | 1s, 2s, 4s |
| API_RATE_LIMIT | 是 | 2 | 60s 冷却 |
| INVALID_DATA | 否 | - | - |
| TIMEOUT | 是 | 2 | 2s, 4s |

### 错误处理代码

```typescript
export class BaseDataSource {
  protected async fetchWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await fn();
        this.updateSuccessRate(true);
        return result;
      } catch (error) {
        const delay = Math.pow(2, attempt) * 1000;

        if (attempt === maxRetries - 1) {
          this.updateSuccessRate(false);
          return null;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return null;
  }
}
```

---

## 降级策略

### 多级降级机制

当所有数据源都失败时，系统采用多级降级策略确保服务可用性：

```typescript
/**
 * 降级策略管理器
 */
class FallbackStrategy {
  private cache: CacheManager;
  private aggregator: DataAggregator;

  /**
   * 获取股票报价（带降级策略）
   */
  async getQuoteWithFallback(symbol: string): Promise<QuoteData> {
    try {
      // 第 1 级：尝试所有数据源
      return await this.aggregator.getQuote(symbol);

    } catch (primaryError) {
      console.warn('[Fallback] Primary sources failed, trying fallback...');

      // 第 2 级：降级到过期的缓存数据
      const expiredCached = this.cache.get(`quote:${symbol}`, { allowExpired: true });
      if (expiredCached) {
        console.warn('[Fallback] Using expired cache data');
        return {
          ...expiredCached,
          _fallback: true,
          _source: 'expired_cache',
          _warning: '显示的是过期数据',
        };
      }

      // 第 3 级：返回默认值（零值）
      console.error('[Fallback] All sources failed, returning default data');
      return this.createDefaultQuote(symbol);
    }
  }

  /**
   * 创建默认报价数据
   * 用于所有数据源都失败时
   */
  private createDefaultQuote(symbol: string): QuoteData {
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
      _source: 'default',
      _fallback: true,
      _error: '无法获取数据，请稍后重试',
    };
  }
}
```

### 降级级别说明

| 级别 | 策略 | 数据质量 | 使用场景 |
|------|------|----------|----------|
| L1 | 正常数据源 | 高 | 正常运行 |
| L2 | 过期缓存 | 中 | API 临时故障 |
| L3 | 默认值 | 低 | 所有数据源不可用 |

### 降级触发条件

```typescript
/**
 * 降级决策器
 */
class FallbackDecision {
  shouldUseFallback(errors: DataSourceError[]): boolean {
    // 所有数据源都失败
    if (errors.length === this.availableSources.length) {
      return true;
    }

    // 检查是否有严重错误
    const hasCriticalError = errors.some(e =>
      e.type === ErrorType.API_RATE_LIMIT ||
      e.type === ErrorType.NETWORK_ERROR
    );

    return hasCriticalError && errors.length >= 2;
  }
}
```

---

## 缓存策略

### 缓存管理器

```typescript
export class CacheManager {
  private memoryCache: Map<string, { data: any; expiry: number }>;

  get(key: string): any | null {
    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.memoryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: any, ttlSeconds: number) {
    this.memoryCache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  invalidate(pattern: string) {
    const regex = new RegExp(pattern);
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  static keys = {
    quote: (symbol: string) => `quote:${symbol}`,
    profile: (symbol: string) => `profile:${symbol}`,
    news: (symbols: string[]) => `news:${symbols.sort().join(',')}`,
    financials: (symbol: string) => `financials:${symbol}`,
  };
}
```

### 缓存失效策略

| 触发条件 | 失效范围 | 说明 |
|---------|---------|------|
| 价格更新 | 单个股票 | 新数据到达时 |
| 定时刷新 | 全部缓存 | 每 5 分钟 |
| 手动清除 | 指定模式 | 管理员操作 |

---

## 实现计划

### 阶段划分（已根据审查调整）

#### 阶段 1：基础设施 (Day 1-2)

**任务清单**：
- [ ] 创建目录结构 `lib/data-sources/`
- [ ] 实现类型定义 `types.ts`
- [ ] 实现基础类 `base.ts`
- [ ] 实现缓存管理器 `cache.ts`
- [ ] 实现错误处理器 `error-handler.ts`
- [ ] 添加环境变量配置

**交付物**：
- 完整的基础设施代码
- 单元测试通过

#### 阶段 2：数据源适配器 (Day 3-7) ⏱ 调整为 5 天

**任务清单**：
- [ ] 实现 FinnhubSource（重构现有代码）
- [ ] 实现 TushareSource（含数据格式转换）⚠️ 复杂度高
- [ ] 实现代码格式转换工具
- [ ] 实现 AlphaVantageSource
- [ ] 添加适配器单元测试

**交付物**：
- 三个数据源适配器
- 测试覆盖率 > 80%

**注意事项**：
- Tushare API 返回数组格式，需要专门处理
- A 股代码格式转换需要充分测试

#### 阶段 3：融合引擎 (Day 8-11) ⏱ 调整为 4 天

**任务清单**：
- [ ] 实现 DataAggregator
- [ ] 实现路由选择逻辑
- [ ] 实现数据融合算法（含价格融合）
- [ ] 实现增强的质量评分系统
- [ ] 实现数据流管道
- [ ] 添加降级策略

**交付物**：
- 完整的融合引擎
- 集成测试通过

#### 阶段 4：集成与测试 (Day 12-17) ⏱ 调整为 6 天

**任务清单**：
- [ ] 更新 `finnhub.actions.ts` 使用聚合器
- [ ] 添加集成测试
- [ ] 手动测试验证（美股、A 股、港股）
- [ ] 性能测试和优化
- [ ] 修复发现的问题

**交付物**：
- 与现有系统集成
- 测试报告

#### 阶段 5：监控与优化 (Day 18-20) ⏱ 调整为 3 天

**任务清单**：
- [ ] 实现监控指标收集
- [ ] 添加日志记录
- [ ] 性能优化
- [ ] 文档更新
- [ ] 部署准备

**交付物**：
- 监控仪表板
- 完整文档

**总计**: **20 个工作日**（原计划 14 天，根据审查意见调整）

### 目录结构

```
lib/data-sources/
├── index.ts                    # 导出接口和主入口
├── types.ts                    # TypeScript 类型定义
├── base.ts                     # BaseDataSource 抽象类
├── config.ts                   # 配置和常量
├── cache.ts                    # 缓存管理器
├── error-handler.ts            # 错误处理器
├── pipeline.ts                 # 数据流管道
├── aggregator.ts               # 数据聚合器
├── monitoring.ts               # 监控指标收集
├── sources/
│   ├── finnhub.ts             # Finnhub 适配器
│   ├── tushare.ts             # Tushare 适配器
│   └── alpha-vantage.ts       # Alpha Vantage 适配器
└── __tests__/
    ├── finnhub.test.ts
    ├── tushare.test.ts
    ├── alpha-vantage.test.ts
    └── integration.test.ts
```

### 环境变量

```bash
# .env 新增配置

# Tushare API
TUSHARE_API_TOKEN=your_tushare_token_here

# Alpha Vantage API
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here

# 数据源配置
DATA_SOURCE_CACHE_ENABLED=true
DATA_SOURCE_CACHE_TTL=60
DATA_SOURCE_TIMEOUT=5000

# 监控配置
DATA_SOURCE_TELEMETRY_ENABLED=false
```

---

## 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| Tushare API 限流 | 高 | 中 | 实现请求队列和缓存，监控使用量 |
| 数据格式不一致 | 中 | 高 | 使用标准化适配器，添加验证 |
| 性能下降 | 中 | 低 | 并行请求 + 多层缓存 |
| 测试数据不足 | 低 | 中 | 使用 mock 数据，模拟多种场景 |
| API Key 泄露 | 高 | 低 | 使用环境变量，不提交到代码库 |

---

## 附录

### A. Tushare API 参考

**文档**：https://tushare.pro/document/2

**主要接口**：
- `daily` - 日线行情
- `daily_basic` - 每日指标
- `fina_indicator_bs` - 资产负债表
- `fina_indicator_profit` - 利润表
- `fina_indicator_cashflow` - 现金流表

### B. Alpha Vantage API 参考

**文档**：https://www.alphavantage.co/documentation/

**主要接口**：
- `GLOBAL_QUOTE` - 实时报价
- `OVERVIEW` - 公司概览
- `INCOME_STATEMENT` - 利润表
- `BALANCE_SHEET` - 资产负债表
- `CASH_FLOW` - 现金流表

### C. 相关文档

- [项目 CLAUDE.md](/Users/berton/Github/OpenStock/CLAUDE.md)
- [API 文档](/api-docs)
- [Finnhub API 文档](https://finnhub.io/docs/api)

---

**文档版本**: 1.1
**最后更新**: 2026-02-20
**作者**: AI Design Assistant

## 变更记录

### v1.1 (2026-02-20) - 审查更新

根据设计审查反馈进行以下改进：

| 序号 | 改进项 | 说明 | 章节 |
|------|--------|------|------|
| 1 | **Tushare API 格式处理** | 添加数据格式转换工具函数 `transformTushareData()` | 数据源实现 |
| 2 | **A 股代码格式优化** | 添加精确的 A 股代码验证器 `StockCodeValidator` | 数据源实现 |
| 3 | **质量评分算法增强** | 添加 `QualityScorer` 类，包含完整性、新鲜度、一致性评分 | 数据融合策略 |
| 4 | **降级策略** | 新增多级降级机制（正常 → 过期缓存 → 默认值） | 降级策略 |
| 5 | **实现时间调整** | 将总时间从 14 天调整为 20 天，更符合实际 | 实现计划 |

### 主要变更内容

#### 1. Tushare API 数据格式处理
```typescript
// 新增：Tushare 返回格式定义
interface TushareResponse<T = any> {
  code: number;
  msg: string;
  data: {
    fields: string[];
    items: T[][];
  };
}

// 新增：数据转换工具
function transformTushareData<T>(response: TushareResponse): T[]
```

#### 2. 精确的 A 股代码判断
```typescript
// 新增：代码验证器
class StockCodeValidator {
  static isAStock(symbol: string): boolean
  static isHKStock(symbol: string): boolean
  static toTushareCode(symbol: string): string
  static toFinnhubCode(symbol: string): string
}
```

#### 3. 增强的质量评分
```typescript
// 新增：质量评分器
class QualityScorer {
  scoreCompleteness(data: any): number  // 字段完整性
  scoreFreshness(data: any): number     // 数据新鲜度
  scoreConsistency(data: any): number   // 数据一致性（新增）
}
```

#### 4. 降级策略
```typescript
// 新增：降级策略管理器
class FallbackStrategy {
  getQuoteWithFallback(symbol: string): Promise<QuoteData>
  // L1: 正常数据源
  // L2: 过期缓存
  // L3: 默认值
}
```

---

### v1.0 (2026-02-20) - 初始版本

完成多数据源聚合系统的初步设计，包括：
- 三层架构设计
- 数据源接口定义
- 数据融合策略
- 错误处理机制
- 缓存策略
- 实现计划

---
