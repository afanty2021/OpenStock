/**
 * 多数据源聚合系统 - 核心聚合器
 *
 * 实现数据源选择、并行请求、数据验证和数据融合
 * @module data-sources/aggregator
 */

import type {
  StockDataSource,
  DataSourceResult,
  QuoteData,
  ProfileData,
  SearchResult,
  FinancialData,
} from './types';
import { FinnhubSource } from './sources/finnhub';
import { TushareSource } from './sources/tushare';
import { AlphaVantageSource } from './sources/alpha-vantage';
// import { YahooFinanceV2Source as YahooFinanceSource } from './sources/yahoo-finance-v2'; // 暂时禁用
import { StockCodeValidator } from './config';

/**
 * 融合结果接口
 * 扩展原始数据类型，添加融合元数据
 */
interface FusedResult<T> extends T {
  _source: string;
  _sourceCount?: number;
  _sources?: Array<{ name: string; quality: number }>;
}

/**
 * 数据聚合器
 *
 * 核心功能：
 * 1. 根据股票代码路由到合适的数据源
 * 2. 并行请求多个数据源
 * 3. 验证和过滤结果
 * 4. 融合多个数据源的数据
 */
export class DataAggregator {
  /** 已注册的数据源 */
  private sources: StockDataSource[] = [];

  /**
   * 构造函数
   * 初始化所有数据源
   */
  constructor() {
    this.sources = [
      new FinnhubSource(),
      new TushareSource(),
      new AlphaVantageSource(),
      // new YahooFinanceSource(), // 暂时禁用，集成复杂
    ];

    // 按优先级排序（数字越小优先级越高）
    this.sources.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 获取股票报价
   * 自动选择数据源、并行请求、融合结果
   *
   * @param symbol 股票代码（如 AAPL, 600519.SS）
   * @returns 融合后的报价数据
   * @throws Error 当所有数据源都失败时
   */
  async getQuote(symbol: string): Promise<FusedResult<QuoteData>> {
    // 1. 选择支持该股票的数据源
    const eligibleSources = this.sources.filter((s) =>
      s.supportsSymbol(symbol)
    );

    if (eligibleSources.length === 0) {
      throw new Error(`No data source supports symbol: ${symbol}`);
    }

    // 2. 并行请求所有数据源
    const results = await Promise.allSettled(
      eligibleSources.map((s) => s.getQuote(symbol))
    );

    // 3. 收集成功的结果
    const validResults: DataSourceResult<QuoteData>[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { data, quality } = result.value;
        // 验证数据有效性
        if (this.isValidQuote(data)) {
          validResults.push({ data, quality, timestamp: result.value.timestamp });
        } else {
          errors.push(
            `${eligibleSources[index].name}: Invalid quote data`
          );
        }
      } else {
        errors.push(
          `${eligibleSources[index].name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`
        );
      }
    });

    if (validResults.length === 0) {
      throw new Error(
        `All data sources failed for ${symbol}:\n${errors.join('\n')}`
      );
    }

    // 4. 融合数据
    return this.fuseQuoteData(validResults);
  }

  /**
   * 获取公司资料
   * 自动选择数据源、并行请求、融合结果
   *
   * @param symbol 股票代码
   * @returns 融合后的公司资料
   * @throws Error 当所有数据源都失败时
   */
  async getProfile(symbol: string): Promise<FusedResult<ProfileData>> {
    // 1. 选择支持该股票的数据源
    const eligibleSources = this.sources.filter((s) =>
      s.supportsSymbol(symbol) && s.capabilities.profile
    );

    if (eligibleSources.length === 0) {
      throw new Error(`No data source supports profile for: ${symbol}`);
    }

    // 2. 并行请求
    const results = await Promise.allSettled(
      eligibleSources.map((s) => s.getProfile(symbol))
    );

    // 3. 收集成功的结果
    const validResults: DataSourceResult<ProfileData>[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { data, quality } = result.value;
        if (this.isValidProfile(data)) {
          validResults.push({ data, quality, timestamp: result.value.timestamp });
        } else {
          errors.push(
            `${eligibleSources[index].name}: Invalid profile data`
          );
        }
      } else {
        errors.push(
          `${eligibleSources[index].name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`
        );
      }
    });

    if (validResults.length === 0) {
      throw new Error(
        `All data sources failed for ${symbol}:\n${errors.join('\n')}`
      );
    }

    // 4. 融合数据
    return this.fuseProfileData(validResults);
  }

  /**
   * 搜索股票
   * 优先使用 Finnhub（支持全球市场搜索）
   *
   * @param query 搜索关键词
   * @returns 搜索结果
   */
  async searchStocks(query: string): Promise<SearchResult[]> {
    // 优先使用 Finnhub 进行搜索
    const finnhub = this.sources.find((s) => s.name === 'finnhub');

    if (!finnhub) {
      return [];
    }

    try {
      const result = await finnhub.searchStocks(query);
      // 返回数组，不添加元数据字段到数组元素
      return result.data;
    } catch (error) {
      // Finnhub 失败时返回空数组
      return [];
    }
  }

  /**
   * 获取财务数据
   * 选择支持财务数据的数据源
   *
   * @param symbol 股票代码
   * @returns 财务数据
   * @throws Error 当所有数据源都失败时
   */
  async getFinancials(symbol: string): Promise<FusedResult<FinancialData>> {
    // 筛选支持财务数据的数据源
    const eligibleSources = this.sources.filter(
      (s) =>
        s.supportsSymbol(symbol) &&
        s.capabilities.financials &&
        s.getFinancials
    );

    if (eligibleSources.length === 0) {
      throw new Error(`No data source supports financials for: ${symbol}`);
    }

    // 2. 并行请求
    const results = await Promise.allSettled(
      eligibleSources.map((s) => s.getFinancials!(symbol))
    );

    // 3. 收集成功的结果
    const validResults: DataSourceResult<FinancialData>[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { data, quality } = result.value;
        if (data) {
          validResults.push({ data, quality, timestamp: result.value.timestamp });
        } else {
          errors.push(
            `${eligibleSources[index].name}: No financial data available`
          );
        }
      } else {
        errors.push(
          `${eligibleSources[index].name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`
        );
      }
    });

    if (validResults.length === 0) {
      throw new Error(
        `All data sources failed for ${symbol}:\n${errors.join('\n')}`
      );
    }

    // 4. 返回最佳质量的数据源结果
    validResults.sort((a, b) => b.quality.total - a.quality.total);
    const best = validResults[0];

    return {
      ...best.data,
      _source: 'single',
      _sourceCount: 1,
      _sources: [{ name: best.data._source, quality: best.quality.total }],
    } as FusedResult<FinancialData>;
  }

  /**
   * 融合报价数据
   * 使用质量加权平均计算价格
   *
   * @param results 多个数据源的结果
   * @returns 融合后的报价数据
   */
  private fuseQuoteData(
    results: DataSourceResult<QuoteData>[]
  ): FusedResult<QuoteData> {
    if (results.length === 0) {
      throw new Error('No valid quote data to fuse');
    }

    if (results.length === 1) {
      return {
        ...results[0].data,
        _source: results[0].data._source,
        _sourceCount: 1,
        _sources: [{ name: results[0].data._source, quality: results[0].quality.total }],
      };
    }

    // 按质量排序
    results.sort((a, b) => b.quality.total - a.quality.total);

    // 质量加权平均价格
    const totalWeight = results.reduce(
      (sum, r) => sum + r.quality.total,
      0
    );

    const weightedPrice = results.reduce(
      (sum, r) => sum + r.data.c * r.quality.total,
      0
    ) / totalWeight;

    // 融合其他字段（使用最高质量源的值）
    const baseData = results[0].data;

    return {
      ...baseData,
      c: Math.round(weightedPrice * 100) / 100, // 保留两位小数
      _source: 'fused',
      _sourceCount: results.length,
      _sources: results.map((r) => ({
        name: r.data._source,
        quality: r.quality.total,
      })),
    };
  }

  /**
   * 融合公司资料数据
   * 使用最高质量源的数据，补充缺失字段
   *
   * @param results 多个数据源的结果
   * @returns 融合后的公司资料
   */
  private fuseProfileData(
    results: DataSourceResult<ProfileData>[]
  ): FusedResult<ProfileData> {
    if (results.length === 0) {
      throw new Error('No valid profile data to fuse');
    }

    // 按质量排序
    results.sort((a, b) => b.quality.total - a.quality.total);

    const baseData = results[0].data;

    if (results.length === 1) {
      return {
        ...baseData,
        _source: baseData._source,
        _sourceCount: 1,
        _sources: [{ name: baseData._source, quality: results[0].quality.total }],
      };
    }

    // 融合策略：从多个源中填充缺失的字段
    const fused: ProfileData = {
      ...baseData,
    };

    // 尝试从其他源补充缺失的 industry
    if (!fused.industry) {
      for (const result of results) {
        if (result.data.industry) {
          fused.industry = result.data.industry;
          break;
        }
      }
    }

    // 尝试从其他源补充缺失的 marketCap
    if (!fused.marketCap) {
      for (const result of results) {
        if (result.data.marketCap) {
          fused.marketCap = result.data.marketCap;
          break;
        }
      }
    }

    // 尝试从其他源补充缺失的 logo
    if (!fused.logo) {
      for (const result of results) {
        if (result.data.logo) {
          fused.logo = result.data.logo;
          break;
        }
      }
    }

    // 尝试从其他源补充缺失的 description
    if (!fused.description) {
      for (const result of results) {
        if (result.data.description) {
          fused.description = result.data.description;
          break;
        }
      }
    }

    return {
      ...fused,
      _source: 'fused',
      _sourceCount: results.length,
      _sources: results.map((r) => ({
        name: r.data._source,
        quality: r.quality.total,
      })),
    };
  }

  /**
   * 验证报价数据有效性
   *
   * @param data 报价数据
   * @returns 是否有效
   */
  private isValidQuote(data: QuoteData): boolean {
    // 必需字段检查
    if (!data.symbol || data.c === null || data.c === undefined) {
      return false;
    }

    // 价格合理性检查
    if (data.c <= 0 || !isFinite(data.c)) {
      return false;
    }

    // 涨跌幅合理性检查
    if (data.dp !== null && data.dp !== undefined && Math.abs(data.dp) > 100) {
      return false; // 单日涨跌幅超过 100% 可能异常
    }

    return true;
  }

  /**
   * 验证公司资料有效性
   *
   * @param data 公司资料数据
   * @returns 是否有效
   */
  private isValidProfile(data: ProfileData): boolean {
    // 必需字段检查
    if (!data.symbol || !data.name) {
      return false;
    }

    return true;
  }

  /**
   * 获取指定市场的数据源
   *
   * @param market 市场代码（US, CN, HK）
   * @returns 支持该市场的数据源列表
   */
  getSourcesForMarket(market: 'US' | 'CN' | 'HK'): StockDataSource[] {
    return this.sources.filter((s) => s.capabilities.markets.includes(market));
  }

  /**
   * 根据股票代码推断市场
   *
   * @param symbol 股票代码
   * @returns 市场代码
   */
  inferMarket(symbol: string): 'US' | 'CN' | 'HK' | 'UNKNOWN' {
    if (StockCodeValidator.isAStock(symbol)) {
      return 'CN';
    }
    if (StockCodeValidator.isHKStock(symbol)) {
      return 'HK';
    }
    // 纯字母代码视为美股
    if (/^[A-Za-z]+$/.test(symbol)) {
      return 'US';
    }
    return 'UNKNOWN';
  }

  /**
   * 添加自定义数据源
   *
   * @param source 数据源实例
   */
  addSource(source: StockDataSource): void {
    this.sources.push(source);
    // 重新按优先级排序
    this.sources.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 获取所有已注册的数据源
   *
   * @returns 数据源列表
   */
  getAllSources(): StockDataSource[] {
    return [...this.sources];
  }

  /**
   * 获取数据源状态信息
   *
   * @returns 数据源状态
   */
  getSourceStatus(): Array<{
    name: string;
    priority: number;
    capabilities: string[];
    markets: string[];
  }> {
    return this.sources.map((s) => ({
      name: s.name,
      priority: s.priority,
      capabilities: Object.entries(s.capabilities)
        .filter(([_, v]) => v === true)
        .map(([k]) => k),
      markets: s.capabilities.markets,
    }));
  }
}

/**
 * 导出单例实例
 * 整个应用应使用此实例访问数据聚合器
 */
export const dataAggregator = new DataAggregator();
