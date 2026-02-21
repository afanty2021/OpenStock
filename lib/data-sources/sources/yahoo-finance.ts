/**
 * Yahoo Finance 数据源适配器
 *
 * 全球股票数据源，支持美股、A股、港股等
 * 无需 API key，免费使用
 * @module data-sources/sources/yahoo-finance
 */

import { BaseDataSource } from '../base';
import type {
  DataSourceResult,
  QuoteDataType,
  ProfileDataType,
  FinancialDataType,
  SearchResultType,
  DataSourceCapabilities,
} from '../types';
import { StockCodeValidator } from '../config';

const BASE_URL = 'https://query1.finance.yahoo.com';
const QUERY_URL = `${BASE_URL}/v8/finance/chart`;

/**
 * Yahoo Finance 数据源
 * 支持全球市场的实时报价、公司资料和财务数据
 * 优先级: 美股3(备用), A股2(首选), 港股1(首选)
 */
export class YahooFinanceSource extends BaseDataSource {
  name = 'yahooFinance';
  priority = 3; // 默认优先级，会根据市场动态调整

  capabilities: DataSourceCapabilities = {
    quote: true,
    profile: true,
    news: false,
    financials: true,
    markets: ['US', 'CN', 'HK', 'GLOBAL'],
  };

  private baseUrl = BASE_URL;
  private queryUrl = QUERY_URL;

  /**
   * 判断是否支持该股票代码
   * Yahoo Finance 支持几乎所有市场的股票
   */
  supportsSymbol(symbol: string): boolean {
    // Yahoo Finance 支持几乎所有市场
    return true;
  }

  /**
   * 获取股票的 Yahoo Finance 代码
   * 转换股票代码到 Yahoo Finance 格式
   */
  private toYahooSymbol(symbol: string): string {
    // 美股：不需要后缀
    if (/^[A-Za-z]+$/.test(symbol)) {
      return symbol;
    }

    // A股：添加 .SS (上海) 或 .SZ (深圳)
    if (symbol.endsWith('.SS') || symbol.endsWith('.SH')) {
      return symbol.replace(/\.SH$/i, '.SS');
    }
    if (symbol.endsWith('.SZ') || symbol.endsWith('.se')) {
      return symbol.replace(/\.se$/i, '.SZ').toUpperCase();
    }

    // 港股：添加 .HK
    if (/^\d{4,5}$/.test(symbol)) {
      return `${symbol}.HK`;
    }
    if (/^\d{4,5}\.HK$/i.test(symbol)) {
      return symbol.toUpperCase();
    }

    return symbol;
  }

  /**
   * 获取股票报价
   */
  async getQuote(symbol: string): Promise<DataSourceResult<QuoteDataType>> {
    const yahooSymbol = this.toYahooSymbol(symbol);
    const url = `${this.queryUrl}/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d&includePrePost=false`;

    const data = await this.fetchWithRetry(async () => {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://finance.yahoo.com/',
          'Origin': 'https://finance.yahoo.com',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site',
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Fetch failed ${res.status}: ${text.substring(0, 100)}`);
      }

      const json = await res.json();

      // 检查是否返回了有效数据
      if (!json.chart || !json.chart.result || json.chart.result.length === 0) {
        throw new Error('No data available for this symbol');
      }

      return json.chart.result[0];
    });

    if (!data) {
      throw new Error('Failed to fetch quote after retries');
    }

    return {
      data: this.normalizeQuote(data, symbol),
      quality: this.createQualityScore(data),
      timestamp: Date.now(),
    };
  }

  /**
   * 获取公司资料
   */
  async getProfile(symbol: string): Promise<DataSourceResult<ProfileDataType>> {
    const yahooSymbol = this.toYahooSymbol(symbol);
    const url = `${this.queryUrl}/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d&includePrePost=false`;

    const data = await this.fetchWithRetry(async () => {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://finance.yahoo.com/',
          'Origin': 'https://finance.yahoo.com',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site',
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Fetch failed ${res.status}: ${text.substring(0, 100)}`);
      }

      const json = await res.json();

      if (!json.chart || !json.chart.result || json.chart.result.length === 0) {
        throw new Error('No data available for this symbol');
      }

      return json.chart.result[0];
    });

    if (!data) {
      throw new Error('Failed to fetch profile after retries');
    }

    return {
      data: this.normalizeProfile(data, symbol),
      quality: this.createQualityScore(data),
      timestamp: Date.now(),
    };
  }

  /**
   * 获取财务数据（简化版）
   */
  async getFinancials(symbol: string): Promise<DataSourceResult<FinancialDataType>> {
    // Yahoo Finance 的财务数据需要不同的 API 端点
    // 这里返回一个简化版本，完整实现需要额外的 API 调用
    return {
      data: {
        symbol,
        period: '',
        revenue: undefined,
        netIncome: undefined,
        totalAssets: undefined,
        totalLiabilities: undefined,
        eps: undefined,
        roe: undefined,
        _source: this.name,
      },
      quality: { total: 50, completeness: 30, freshness: 80, reliability: 70 },
      timestamp: Date.now(),
    };
  }

  /**
   * 搜索股票（Yahoo Finance 不支持搜索）
   */
  async searchStocks(): Promise<DataSourceResult<SearchResultType[]>> {
    return {
      data: [],
      quality: { total: 0, completeness: 0, freshness: 0, reliability: 0 },
      timestamp: Date.now(),
    };
  }

  /**
   * 规范化报价数据
   * Yahoo Finance chart API 返回格式
   */
  private normalizeQuote(data: any, symbol: string): QuoteDataType {
    const meta = data.meta;
    const indicators = data.indicators;
    const quote = indicators?.quote?.[0];
    const price = meta?.regularMarketPrice || quote?.close?.[0] || 0;
    const prevClose = meta?.previousClose || quote?.open?.[0] || 0;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return {
      symbol,
      c: price || 0,
      d: change || 0,
      dp: changePercent || 0,
      h: meta?.regularMarketDayHigh || quote?.high?.[0] || 0,
      l: meta?.regularMarketDayLow || quote?.low?.[0] || 0,
      o: meta?.regularMarketOpen || quote?.open?.[0] || 0,
      pc: prevClose || 0,
      t: meta?.regularMarketTime || Date.now() / 1000,
      v: meta?.regularMarketVolume || quote?.volume?.[0] || 0,
      _source: this.name,
    };
  }

  /**
   * 规范化公司资料数据
   */
  private normalizeProfile(data: any, symbol: string): ProfileDataType {
    const meta = data.meta;

    return {
      symbol,
      name: meta?.longName || meta?.shortName || symbol,
      exchange: meta?.exchangeName || meta?.fullExchangeName || 'UNKNOWN',
      industry: meta?.sector || undefined,
      marketCap: meta?.marketCap || undefined,
      logo: undefined,
      website: undefined,
      description: undefined,
      _source: this.name,
    };
  }

  /**
   * 创建质量评分
   * Yahoo Finance 数据质量评估
   */
  protected createQualityScore(data: any): { total: number; completeness: number; freshness: number; reliability: number } {
    let completeness = 0;
    let freshness = 90;
    let reliability = 75;

    // 完整性评分
    if (data.meta) {
      completeness += 30;
      if (data.meta.regularMarketPrice) completeness += 20;
      if (data.meta.previousClose) completeness += 15;
      if (data.meta.marketCap) completeness += 15;
      if (data.meta.exchangeName) completeness += 10;
      if (data.indicators?.quote?.[0]) completeness += 10;
    }

    const total = (completeness + freshness + reliability) / 3;

    return {
      total: Math.round(total),
      completeness: Math.round(completeness),
      freshness: Math.round(freshness),
      reliability: Math.round(reliability),
    };
  }
}
