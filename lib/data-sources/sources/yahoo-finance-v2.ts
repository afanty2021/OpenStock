/**
 * Yahoo Finance 数据源适配器（基于 yahoo-finance2 库）
 *
 * 使用 yahoo-finance2 库，支持全球市场
 * 无需 API key，免费使用
 * @module data-sources/sources/yahoo-finance-v2
 */

import { BaseDataSource } from '../base';
import type {
  DataSourceResult,
  QuoteDataType,
  ProfileDataType,
  SearchResultType,
  DataSourceCapabilities,
} from '../types';
import yahooFinance from 'yahoo-finance2';

/**
 * Yahoo Finance 数据源 (V2)
 * 使用 yahoo-finance2 库，支持全球市场
 */
export class YahooFinanceV2Source extends BaseDataSource {
  name = 'yahooFinance';
  priority = 2; // 港股首选，美股/A股备用

  capabilities: DataSourceCapabilities = {
    quote: true,
    profile: true,
    news: false,
    financials: false,
    markets: ['US', 'CN', 'HK', 'GLOBAL'],
  };

  /**
   * 判断是否支持该股票代码
   * Yahoo Finance 支持几乎所有市场
   */
  supportsSymbol(symbol: string): boolean {
    return true;
  }

  /**
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

    const data = await this.fetchWithRetry(async () => {
      const result = await yahooFinance.quote(yahooSymbol);
      return result;
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

    const data = await this.fetchWithRetry(async () => {
      const result = await yahooFinance.quoteSummary(yahooSymbol, {
        modules: ['summaryProfile', 'summaryDetail', 'price'],
      });
      return result;
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
   * 搜索股票
   */
  async searchStocks(query: string): Promise<DataSourceResult<SearchResultType[]>> {
    const data = await this.fetchWithRetry(async () => {
      const result = await yahooFinance.search(query);
      return result;
    });

    if (!data || !data.quotes) {
      return {
        data: [],
        quality: { total: 0, completeness: 0, freshness: 0, reliability: 0 },
        timestamp: Date.now(),
      };
    }

    const results = data.quotes.map((quote: any) => ({
      symbol: quote.symbol,
      name: quote.longname || quote.shortname || quote.symbol,
      type: quote.quoteType || 'EQUITY',
      exchange: quote.exchange || '',
    }));

    return {
      data: results,
      quality: { total: 85, completeness: 80, freshness: 90, reliability: 85 },
      timestamp: Date.now(),
    };
  }

  /**
   * 规范化报价数据
   */
  private normalizeQuote(data: any, symbol: string): QuoteDataType {
    const currentPrice = data.regularMarketPrice || data.price || 0;
    const prevClose = data.previousClose || 0;
    const change = data.regularMarketChange || (currentPrice - prevClose);
    const changePercent = data.regularMarketChangePercent ||
      (prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0);

    return {
      symbol,
      c: currentPrice,
      d: change,
      dp: changePercent,
      h: data.regularMarketDayHigh || data.dayHigh || 0,
      l: data.regularMarketDayLow || data.dayLow || 0,
      o: data.regularMarketOpen || data.open || 0,
      pc: prevClose,
      t: data.regularMarketTime || Date.now() / 1000,
      v: data.regularMarketVolume || data.volume || 0,
      _source: this.name,
    };
  }

  /**
   * 规范化公司资料数据
   */
  private normalizeProfile(data: any, symbol: string): ProfileDataType {
    const price = data.price;
    const profile = data.summaryProfile;
    const detail = data.summaryDetail;

    return {
      symbol,
      name: price?.longName || price?.shortName || symbol,
      exchange: price?.exchangeName || price?.exchange || 'UNKNOWN',
      industry: profile?.industry || profile?.sector || undefined,
      marketCap: detail?.marketCap || price?.marketCap || undefined,
      logo: undefined,
      website: profile?.website || undefined,
      description: profile?.longBusinessSummary || undefined,
      _source: this.name,
    };
  }

  /**
   * 创建质量评分
   */
  protected createQualityScore(data: any): { total: number; completeness: number; freshness: number; reliability: number } {
    let completeness = 0;

    if (data) {
      completeness += 20;
      if (data.regularMarketPrice || data.price) completeness += 20;
      if (data.previousClose) completeness += 15;
      if (data.regularMarketDayHigh || data.dayHigh) completeness += 15;
      if (data.regularMarketDayLow || data.dayLow) completeness += 15;
      if (data.regularMarketVolume || data.volume) completeness += 15;
    }

    const freshness = 88;
    const reliability = 80;
    const total = (completeness + freshness + reliability) / 3;

    return {
      total: Math.round(total),
      completeness: Math.round(completeness),
      freshness: Math.round(freshness),
      reliability: Math.round(reliability),
    };
  }
}
