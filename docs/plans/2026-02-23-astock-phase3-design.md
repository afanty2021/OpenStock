# A 股功能扩展 - 第三阶段设计文档

**项目**: OpenStock
**日期**: 2026-02-23
**版本**: 1.0
**状态**: 规划中

---

## 概述

### 背景

第二阶段已完善 A 股特色数据展示：
- 龙虎榜数据展示（top_list/top_inst）
- 资金流向监控（moneyflow）
- 板块指数支持（block_trade/concept）
- 融资融券数据（margin_detail）

### 第三阶段目标

实现智能分析能力，利用 MiniMax AI 提供高级金融分析：

1. **AI 新闻分析** - 自动分析市场新闻，提取关键信息
2. **财报智能解读** - AI 解读上市公司财报，生成投资要点
3. **选股策略工具** - 基于条件的智能选股筛选
4. **回测框架** - 历史数据回测，验证策略有效性

### 设计原则

- **复用现有 AI 基础设施** - 基于 Inngest + MiniMax
- **模块化设计** - 每个功能独立，便于测试
- **渐进式交付** - 可分任务逐步完成
- **YAGNI** - 仅实现当前明确所需的功能

---

## 需求分析

### 功能需求

| 需求ID | 描述 | 优先级 |
|--------|------|--------|
| F1 | AI 新闻情感分析 | P0 |
| F2 | 新闻关键事件提取 | P0 |
| F3 | 财报数据解析与解读 | P0 |
| F4 | 财报要点摘要生成 | P1 |
| F5 | 多条件选股筛选器 | P0 |
| F6 | 策略保存与管理 | P1 |
| F7 | 历史回测引擎 | P1 |
| F8 | 回测报告生成 | P2 |

### Tushare API 接口映射

| 功能 | Tushare 接口 | 说明 |
|------|-------------|------|
| 财报数据 | income, balance_sheet, cashflow | 三大财务报表 |
| 财务指标 | fina_indicator | 财务指标数据 |
| 每日指标 | daily_basic | 日线基本指标 |
| 资金流向 | moneyflow | 个股资金流向 |
| 龙虎榜 | top_list | 上榜数据 |

---

## 架构设计

### 目录结构

```
lib/data-sources/
├── astock/
│   ├── index.ts                      # 导出
│   ├── ai-news-analyzer.ts          # [新增] AI 新闻分析器
│   ├── financial-report-reader.ts   # [新增] 财报智能解读
│   ├── stock-screener.ts             # [新增] 选股筛选器
│   ├── backtest-engine.ts           # [新增] 回测引擎
│   └── strategy-manager.ts           # [新增] 策略管理器
├── sources/
│   └── tushare.ts                    # [扩展] 补充财报接口
```

### 数据流

```
用户请求
    │
    ▼
┌─────────────────────────────────────┐
│  AI 分析层 (Inngest + MiniMax)     │
│  - NewsAnalyzer                    │
│  - FinancialReportReader           │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  业务逻辑层                         │
│  - StockScreener                   │
│  - BacktestEngine                  │
│  - StrategyManager                 │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  数据层 (Tushare API)               │
│  - 财报接口                         │
│  - 资金流向                         │
│  - 每日指标                         │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  前端组件 (UI Layer)                │
│  - NewsAnalysisCard                │
│  - FinancialReportPanel            │
│  - ScreenerPanel                   │
│  - BacktestResults                 │
└─────────────────────────────────────┘
```

---

## 模块详细设计

### 1. AINewsAnalyzer - AI 新闻分析器

**功能**：
- 新闻情感分析（看涨/看跌/中性）
- 关键事件提取（并购、财报、政策等）
- 相关股票关联

**接口设计**：

```typescript
interface NewsArticle {
  id: string;
  title: string;
  content: string;
  source: string;
  publishedAt: string;
  relatedSymbols: string[];
}

interface NewsAnalysisResult {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;      // -1 到 1
  keyEvents: string[];          // 关键事件列表
  impactStocks: string[];       // 受影响股票
  summary: string;              // AI 生成的摘要
  riskLevel: 'high' | 'medium' | 'low';
}

interface AINewsAnalyzer {
  // 分析单条新闻
  analyzeNews(article: NewsArticle): Promise<NewsAnalysisResult>;

  // 批量分析新闻
  analyzeNewsBatch(articles: NewsArticle[]): Promise<NewsAnalysisResult[]>;

  // 获取新闻热点
  getMarketHotTopics(days: number): Promise<HotTopic[]>;
}
```

**AI 提示词设计**：

```typescript
const NEWS_ANALYSIS_PROMPT = `你是一位专业的金融市场分析师。请分析以下新闻文章：

标题：{{title}}
内容：{{content}}

请分析并返回以下信息：
1. 情感倾向（看涨/看跌/中性）及置信度
2. 关键事件（并购、财报、政策、业绩等）
3. 可能受影响的股票代码
4. 风险等级（高/中/低）
5. 一句话摘要

请以JSON格式返回结果。`;
```

### 2. FinancialReportReader - 财报智能解读

**功能**：
- 解析三大财务报表（利润表、资产负债表、现金流量表）
- 计算关键财务指标
- 生成 AI 投资要点

**接口设计**：

```typescript
interface FinancialReport {
  tsCode: string;
  reportDate: string;        // 报告期
  reportType: 'annual' | 'quarterly';
  // 利润表
  revenue: number;           // 营业收入
  netProfit: number;          // 净利润
  grossProfit: number;       // 毛利润
  // 资产负债表
  totalAssets: number;        // 总资产
  totalLiabilities: number;  // 总负债
  equity: number;            // 股东权益
  // 现金流量表
  operatingCashFlow: number; // 经营现金流
  investingCashFlow: number; // 投资现金流
  financingCashFlow: number; // 筹资现金流
}

interface FinancialMetrics {
  // 盈利能力
  roe: number;               // 净资产收益率 %
  roa: number;              // 总资产收益率 %
  grossMargin: number;       // 毛利率 %
  netMargin: number;         // 净利率 %
  // 偿债能力
  currentRatio: number;      // 流动比率
  debtRatio: number;         // 资产负债率 %
  // 成长能力
  revenueGrowth: number;     // 营收增长率 %
  profitGrowth: number;       // 净利润增长率 %
  // 估值
  pe: number;                // 市盈率
  pb: number;                // 市净率
}

interface FinancialAnalysis {
  report: FinancialReport;
  metrics: FinancialMetrics;
  highlights: string[];      // AI 生成的要点
  risks: string[];           // 风险提示
  recommendation: 'buy' | 'hold' | 'sell';
  recommendationReason: string;
}

interface FinancialReportReader {
  // 获取财报数据
  getFinancialReport(tsCode: string, period: string): Promise<FinancialReport>;

  // 获取财务指标
  getFinancialMetrics(tsCode: string, periods: number): Promise<FinancialMetrics>;

  // AI 解读财报
  analyzeReport(tsCode: string, period: string): Promise<FinancialAnalysis>;

  // 批量获取多季度对比
  getQuarterlyComparison(tsCode: string, quarters: number): Promise<FinancialReport[]>;
}
```

**AI 提示词设计**：

```typescript
const FINANCIAL_REPORT_PROMPT = `你是一位资深的财务分析师。请分析以下公司的财报数据：

股票代码：{{tsCode}}
报告期：{{reportDate}}
财务数据：{{financialData}}

请分析并返回：
1. 关键亮点（3-5条）
2. 潜在风险（2-3条）
3. 投资建议（买入/持有/卖出）
4. 建议理由

请用通俗易懂的语言解释专业术语。重点关注营收增长、盈利能力、现金流状况。`;
```

### 3. StockScreener - 选股筛选器

**功能**：
- 多条件组合筛选
- 预设策略模板
- 自定义筛选条件

**接口设计**：

```typescript
// 筛选条件类型
interface ScreenerCriteria {
  // 市场条件
  market?: 'A' | 'HK' | 'US';
  exchange?: 'SH' | 'SZ';

  // 估值条件
  pe?: { min?: number; max?: number };
  pb?: { min?: number; max?: number };
  marketCap?: { min?: number; max?: number };  // 亿元

  // 盈利能力
  roe?: { min?: number };
  grossMargin?: { min?: number };
  netMargin?: { min?: number };

  // 成长能力
  revenueGrowth?: { min?: number };
  profitGrowth?: { min?: number };

  // 技术指标
  priceChange?: { min?: number; max?: number };  // 日涨跌幅 %
  turnoverRate?: { min?: number };  // 换手率 %

  // 资金流向
  netInflow?: { min?: number };  // 日主力净流入(万元)

  // 龙虎榜
  topListDays?: number;  // N日内上榜
}

interface ScreenerResult {
  tsCode: string;
  name: string;
  currentPrice: number;
  changePercent: number;
  pe: number;
  pb: number;
  roe: number;
  marketCap: number;
  score: number;  // 综合评分
}

interface StockScreener {
  // 执行筛选
  screen(criteria: ScreenerCriteria, limit?: number): Promise<ScreenerResult[]>;

  // 预设策略筛选
  screenWithStrategy(strategy: string, limit?: number): Promise<ScreenerResult[]>;

  // 获取可用的筛选条件
  getAvailableCriteria(): ScreenerCriteriaTemplate[];
}

// 预设策略
const PRESET_STRATEGIES = {
  'value-investing': {
    name: '价值投资',
    criteria: { pe: { max: 15 }, roe: { min: 10 }, pb: { max: 2 } }
  },
  'growth-stocks': {
    name: '成长股',
    criteria: { revenueGrowth: { min: 20 }, profitGrowth: { min: 15 } }
  },
  'turnaround': {
    name: '困境反转',
    criteria: { profitGrowth: { min: 10 }, netMargin: { min: 5 } }
  },
  'dividend': {
    name: '高股息',
    criteria: { roe: { min: 8 }, netMargin: { min: 10 } }
  }
};
```

### 4. BacktestEngine - 回测引擎

**功能**：
- 基于历史数据验证选股策略
- 计算收益率、最大回撤等指标
- 生成可视化报告

**接口设计**：

```typescript
interface BacktestConfig {
  strategy: ScreenerCriteria;       // 筛选条件
  startDate: string;                 // 开始日期 YYYYMMDD
  endDate: string;                   // 结束日期 YYYYMMDD
  initialCapital: number;            // 初始资金(万元)
  holdingPeriod: number;             // 持仓周期(天)
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
  maxPositions: number;               // 最大持仓数
}

interface BacktestPosition {
  tsCode: string;
  name: string;
  buyDate: string;
  buyPrice: number;
  sellDate?: string;
  sellPrice?: number;
  quantity: number;
  return: number;                     // 收益率 %
}

interface BacktestResult {
  config: BacktestConfig;
  // 收益指标
  totalReturn: number;               // 总收益率 %
  annualizedReturn: number;           // 年化收益率 %
  benchmarkReturn: number;            // 基准收益率 %
  alpha: number;                      // Alpha
  beta: number;                       // Beta
  // 风险指标
  maxDrawdown: number;               // 最大回撤 %
  volatility: number;                 // 波动率 %
  sharpeRatio: number;               // 夏普比率
  // 交易统计
  totalTrades: number;               // 总交易次数
  winRate: number;                   // 胜率 %
  avgWin: number;                     // 平均盈利 %
  avgLoss: number;                    // 平均亏损 %
  // 持仓记录
  positions: BacktestPosition[];
  // 每日净值
  equityCurve: { date: string; value: number }[];
}

interface BacktestEngine {
  // 运行回测
  runBacktest(config: BacktestConfig): Promise<BacktestResult>;

  // 获取回测详情
  getPositionDetails(backtestId: string): Promise<BacktestPosition[]>;

  // 对比策略
  compareStrategies(configs: BacktestConfig[]): Promise<BacktestResult[]>;
}
```

### 5. StrategyManager - 策略管理器

**功能**：
- 保存用户的自定义筛选策略
- 策略版本管理
- 策略分享

**接口设计**：

```typescript
interface SavedStrategy {
  id: string;
  userId: string;
  name: string;
  description: string;
  criteria: ScreenerCriteria;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  // 回测结果摘要
  backtestSummary?: {
    totalReturn: number;
    winRate: number;
    sharpeRatio: number;
  };
}

interface StrategyManager {
  // 保存策略
  saveStrategy(userId: string, strategy: Omit<SavedStrategy, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedStrategy>;

  // 获取用户策略列表
  getUserStrategies(userId: string): Promise<SavedStrategy[]>;

  // 更新策略
  updateStrategy(id: string, updates: Partial<SavedStrategy>): Promise<SavedStrategy>;

  // 删除策略
  deleteStrategy(id: string): Promise<void>;

  // 克隆公开策略
  cloneStrategy(strategyId: string, userId: string): Promise<SavedStrategy>;

  // 获取公开策略
  getPublicStrategies(): Promise<SavedStrategy[]>;
}
```

---

## 前端组件设计

### 1. NewsAnalysisCard - 新闻分析卡片

```tsx
interface NewsAnalysisCardProps {
  article: NewsArticle;
  analysis?: NewsAnalysisResult;
  onAnalyze?: () => void;
}
```

功能：
- 显示新闻标题和来源
- 展示 AI 情感分析结果（颜色编码）
- 显示关键事件标签
- 一句话摘要

### 2. FinancialReportPanel - 财报解读面板

```tsx
interface FinancialReportPanelProps {
  tsCode: string;
  period?: string;  // 默认最新季度
  showDetails?: boolean;
}
```

功能：
- 展示关键财务指标卡片
- AI 生成的财报要点
- 投资建议展示
- 季度对比图表

### 3. ScreenerPanel - 选股面板

```tsx
interface ScreenerPanelProps {
  onScreen?: (criteria: ScreenerCriteria) => void;
  initialCriteria?: ScreenerCriteria;
}
```

功能：
- 条件筛选器 UI
- 预设策略快捷按钮
- 筛选结果表格
- 保存策略入口

### 4. BacktestResults - 回测结果

```tsx
interface BacktestResultsProps {
  result: BacktestResult;
  showChart?: boolean;
}
```

功能：
- 收益指标卡片
- 净值曲线图
- 回撤曲线图
- 持仓记录明细

---

## 实施计划

### 任务拆分

#### Task 1: AI 新闻分析模块
- [ ] 1.1 扩展 Tushare 财经新闻接口
- [ ] 1.2 实现 AINewsAnalyzer 类
- [ ] 1.3 编写单元测试（覆盖率>80%）
- [ ] 1.4 创建 NewsAnalysisCard 组件
- [ ] 1.5 集成到新闻页面

#### Task 2: 财报智能解读
- [ ] 2.1 新增 Tushare 财报接口（income, balance_sheet, cashflow）
- [ ] 2.2 实现 FinancialReportReader 类
- [ ] 2.3 编写单元测试（覆盖率>80%）
- [ ] 2.4 创建 FinancialReportPanel 组件
- [ ] 2.5 集成到股票详情页

#### Task 3: 选股筛选器
- [ ] 3.1 实现 StockScreener 类
- [ ] 3.2 编写单元测试（覆盖率>80%）
- [ ] 3.3 创建 ScreenerPanel 组件
- [ ] 3.4 创建选股结果页面
- [ ] 3.5 集成 Tushare 筛选条件

#### Task 4: 回测框架
- [ ] 4.1 实现 BacktestEngine 类
- [ ] 4.2 编写单元测试（覆盖率>80%）
- [ ] 4.3 创建 BacktestResults 组件
- [ ] 4.4 实现净值曲线可视化
- [ ] 4.5 创建回测配置页面

#### Task 5: 策略管理
- [ ] 5.1 实现 StrategyManager 类
- [ ] 5.2 创建策略保存/编辑 UI
- [ ] 5.3 添加 MongoDB 模型
- [ ] 5.4 实现策略克隆功能

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
  const analysis = await newsAnalyzer.analyzeNews(article);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // API 限流 - 返回缓存结果或降级处理
    return getCachedAnalysis(article.id);
  }
  if (error.message.includes('invalid content')) {
    // 内容无效
    throw new ValidationError('新闻内容无法解析');
  }
  // 其他错误
  throw error;
}
```

### 数据验证

- 股票代码格式验证
- 日期范围验证
- 财务数据数值校验

---

## 测试策略

### 单元测试

使用 Vitest + TypeScript：

```typescript
// ai-news-analyzer.test.ts
describe('AINewsAnalyzer', () => {
  it('should analyze news sentiment', async () => {
    const analyzer = new AINewsAnalyzer(minimaxClient);
    const result = await analyzer.analyzeNews(sampleArticle);
    expect(result.sentiment).toMatch(/bullish|bearish|neutral/);
    expect(result.sentimentScore).toBeGreaterThanOrEqual(-1);
    expect(result.sentimentScore).toBeLessThanOrEqual(1);
  });

  it('should extract key events', async () => {
    const analyzer = new AINewsAnalyzer(minimaxClient);
    const result = await analyzer.analyzeNews(sampleArticle);
    expect(result.keyEvents).toBeInstanceOf(Array);
  });
});
```

### Mock 策略

- Mock MiniMax API 响应
- Mock Tushare API 响应
- 使用静态 JSON 文件存储测试数据

---

## 依赖关系

```
Task 1 (AI 新闻分析)
    │
    ├── 依赖: MiniMax AI API
    └── 前置: 第二阶段 Tushare 基础

Task 2 (财报解读)
    │
    ├── 依赖: Tushare 财报接口
    └── 前置: 第二阶段 Tushare 基础

Task 3 (选股筛选)
    │
    ├── 依赖: Tushare 筛选接口
    └── 前置: 第二阶段 Tushare 基础

Task 4 (回测框架)
    │
    ├── 依赖: Task 3 选股筛选
    └── 前置: Tushare 历史数据

Task 5 (策略管理)
    │
    ├── 依赖: Task 3 选股筛选
    └── 前置: MongoDB 模型
```

---

## 验收标准

### 功能验收

| 功能 | 验收条件 |
|------|---------|
| AI 新闻分析 | 能分析新闻情感，提取关键事件 |
| 财报解读 | 显示关键指标，AI 生成要点 |
| 选股筛选 | 支持多条件组合，返回符合条件股票 |
| 回测框架 | 能运行回测，显示收益和风险指标 |
| 策略管理 | 能保存、编辑、克隆策略 |

### 质量验收

| 指标 | 目标 |
|------|------|
| 测试覆盖率 | > 80% |
| API 响应时间 | P95 < 5s |
| 代码规范 | ESLint 通过 |

---

## 后续扩展

### Phase 4 规划

1. **实时推送** - WebSocket 实时新闻推送
2. **智能推荐** - 基于用户持仓的 AI 推荐
3. **组合管理** - 多策略组合跟踪
4. **模拟交易** - 虚拟组合交易

---

## 环境变量

```env
# MiniMax AI (已配置)
MINIMAX_API_KEY=your_minimax_api_key

# Tushare (已配置)
TUSHARE_API_TOKEN=your_tushare_token
```
