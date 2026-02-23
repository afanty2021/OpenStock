/**
 * AI 新闻分析类型定义
 * @module data-sources/astock/types
 */

/**
 * 新闻文章
 */
export interface NewsArticle {
  /** 新闻 ID */
  id: string;
  /** 新闻标题 */
  title: string;
  /** 新闻内容 */
  content: string;
  /** 新闻来源 */
  source: string;
  /** 发布时间 */
  publishedAt: string;
  /** 相关股票代码 */
  relatedSymbols: string[];
}

/**
 * 新闻分析结果
 */
export interface NewsAnalysisResult {
  /** 情感倾向 */
  sentiment: 'bullish' | 'bearish' | 'neutral';
  /** 情感分数 (-1 到 1) */
  sentimentScore: number;
  /** 关键事件列表 */
  keyEvents: string[];
  /** 受影响股票代码 */
  impactStocks: string[];
  /** AI 生成的摘要 */
  summary: string;
  /** 风险等级 */
  riskLevel: 'high' | 'medium' | 'low';
}

/**
 * 市场热点话题
 */
export interface HotTopic {
  /** 话题名称 */
  topic: string;
  /** 情感倾向 */
  sentiment: 'bullish' | 'bearish' | 'neutral';
  /** 相关股票代码 */
  relatedStocks: string[];
  /** 新闻数量 */
  newsCount: number;
  /** 最后更新时间 */
  lastUpdate: string;
}

/**
 * 筛选条件
 */
export interface ScreenerCriteria {
  /** 市场条件 */
  market?: 'A' | 'HK' | 'US';
  /** 交易所 */
  exchange?: 'SH' | 'SZ';
  /** 市盈率范围 */
  pe?: { min?: number; max?: number };
  /** 市净率范围 */
  pb?: { min?: number; max?: number };
  /** 市值范围（亿元）*/
  marketCap?: { min?: number; max?: number };
  /** 净资产收益率 */
  roe?: { min?: number };
  /** 毛利率 */
  grossMargin?: { min?: number };
  /** 净利率 */
  netMargin?: { min?: number };
  /** 营收增长率 */
  revenueGrowth?: { min?: number };
  /** 净利润增长率 */
  profitGrowth?: { min?: number };
  /** 日涨跌幅 */
  priceChange?: { min?: number; max?: number };
  /** 换手率 */
  turnoverRate?: { min?: number };
  /** 日主力净流入 */
  netInflow?: { min?: number };
  /** N日内上榜 */
  topListDays?: number;
}

/**
 * 筛选结果
 */
export interface ScreenerResult {
  /** 股票代码 */
  tsCode: string;
  /** 股票名称 */
  name: string;
  /** 当前价格 */
  currentPrice: number;
  /** 涨跌幅 */
  changePercent: number;
  /** 市盈率 */
  pe: number;
  /** 市净率 */
  pb: number;
  /** 净资产收益率 */
  roe: number;
  /** 市值（亿元）*/
  marketCap: number;
  /** 综合评分 */
  score: number;
}

/**
 * 回测配置
 */
export interface BacktestConfig {
  /** 筛选条件 */
  strategy: ScreenerCriteria;
  /** 开始日期 YYYYMMDD */
  startDate: string;
  /** 结束日期 YYYYMMDD */
  endDate: string;
  /** 初始资金（万元）*/
  initialCapital: number;
  /** 持仓周期（天）*/
  holdingPeriod: number;
  /** 调仓频率 */
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
  /** 最大持仓数 */
  maxPositions: number;
}

/**
 * 回测持仓
 */
export interface BacktestPosition {
  /** 股票代码 */
  tsCode: string;
  /** 股票名称 */
  name: string;
  /** 买入日期 */
  buyDate: string;
  /** 买入价格 */
  buyPrice: number;
  /** 卖出日期 */
  sellDate?: string;
  /** 卖出价格 */
  sellPrice?: number;
  /** 数量 */
  quantity: number;
  /** 收益率 */
  return: number;
}

/**
 * 回测结果
 */
export interface BacktestResult {
  /** 回测配置 */
  config: BacktestConfig;
  /** 总收益率 */
  totalReturn: number;
  /** 年化收益率 */
  annualizedReturn: number;
  /** 基准收益率 */
  benchmarkReturn: number;
  /** Alpha */
  alpha: number;
  /** Beta */
  beta: number;
  /** 最大回撤 */
  maxDrawdown: number;
  /** 波动率 */
  volatility: number;
  /** 夏普比率 */
  sharpeRatio: number;
  /** 总交易次数 */
  totalTrades: number;
  /** 胜率 */
  winRate: number;
  /** 平均盈利 */
  avgWin: number;
  /** 平均亏损 */
  avgLoss: number;
  /** 持仓记录 */
  positions: BacktestPosition[];
  /** 每日净值 */
  equityCurve: { date: string; value: number }[];
}

/**
 * 保存的策略
 */
export interface SavedStrategy {
  /** 策略 ID */
  id: string;
  /** 用户 ID */
  userId: string;
  /** 策略名称 */
  name: string;
  /** 策略描述 */
  description: string;
  /** 筛选条件 */
  criteria: ScreenerCriteria;
  /** 是否公开 */
  isPublic: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 回测结果摘要 */
  backtestSummary?: {
    totalReturn: number;
    winRate: number;
    sharpeRatio: number;
  };
}
