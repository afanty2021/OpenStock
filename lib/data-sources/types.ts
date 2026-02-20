/**
 * 多数据源聚合系统 - 类型定义
 *
 * 定义数据源接口、数据类型和质量评分系统
 * @module data-sources/types
 */

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

/**
 * 搜索结果
 */
export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}
