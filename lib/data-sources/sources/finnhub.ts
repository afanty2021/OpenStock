/**
 * Finnhub 数据源适配器
 *
 * 美股和国际市场的主要数据源
 * @module data-sources/sources/finnhub
 */

import { BaseDataSource } from '../base';
import type {
  DataSourceResult,
  QuoteDataType,
  ProfileDataType,
  SearchResultType,
  DataSourceCapabilities,
} from '../types';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '';

/**
 * Finnhub 数据源
 * 支持美股和国际市场的实时报价、公司资料和新闻
 */
export class FinnhubSource extends BaseDataSource {
  name = 'finnhub';
  priority = 1; // 美股首选

  capabilities: DataSourceCapabilities = {
    quote: true,
    profile: true,
    news: true,
    financials: false,
    markets: ['US', 'GLOBAL'],
  };

  private baseUrl = FINNHUB_BASE_URL;
  private apiKey = API_KEY;

  /**
   * 判断是否支持该股票代码
   * Finnhub 支持美股和国际股票，包括港股
   * 不支持 A 股
   */
  supportsSymbol(symbol: string): boolean {
    // 支持港股，不支持 A 股
    return !StockCodeValidator.isAStock(symbol);
  }

  /**
   * 获取股票报价
   */
  async getQuote(symbol: string): Promise<DataSourceResult<QuoteDataType>> {
    const data = await this.fetchWithRetry(async () => {
      if (!this.apiKey) {
        throw new Error('Finnhub API key is not configured');
      }

      const url = `${this.baseUrl}/quote?symbol=${encodeURIComponent(symbol)}&token=${this.apiKey}`;
      const res = await fetch(url);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Fetch failed ${res.status}: ${text}`);
      }

      return res.json();
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
    const data = await this.fetchWithRetry(async () => {
      if (!this.apiKey) {
        throw new Error('Finnhub API key is not configured');
      }

      const url = `${this.baseUrl}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${this.apiKey}`;
      const res = await fetch(url, {
        cache: 'force-cache',
        next: { revalidate: 86400 }, // 24 hours
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Fetch failed ${res.status}: ${text}`);
      }

      return res.json();
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
      if (!this.apiKey) {
        throw new Error('Finnhub API key is not configured');
      }

      const trimmed = query.trim();
      if (!trimmed) return [];

      const url = `${this.baseUrl}/search?q=${encodeURIComponent(trimmed)}&token=${this.apiKey}`;
      const res = await fetch(url);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Fetch failed ${res.status}: ${text}`);
      }

      const json = await res.json();
      return json.result || [];
    });

    if (!data) {
      return {
        data: [],
        quality: { total: 0, completeness: 0, freshness: 0, reliability: 0 },
        timestamp: Date.now(),
      };
    }

    const results = data.slice(0, 15).map((r: any) => ({
      symbol: (r.symbol || '').toUpperCase(),
      name: r.description || r.symbol,
      exchange: this.extractExchange(r),
      type: r.type || 'Stock',
    }));

    return {
      data: results,
      quality: { total: 90, completeness: 90, freshness: 85, reliability: 95 },
      timestamp: Date.now(),
    };
  }

  /**
   * 规范化报价数据
   */
  private normalizeQuote(data: any, symbol: string): QuoteDataType {
    return {
      symbol,
      c: data.c || 0,
      d: data.d || 0,
      dp: data.dp || 0,
      h: data.h || 0,
      l: data.l || 0,
      o: data.o || 0,
      pc: data.pc || 0,
      t: data.t || Date.now() / 1000,
      _source: this.name,
    };
  }

  /**
   * 规范化公司资料数据
   */
  private normalizeProfile(data: any, symbol: string): ProfileDataType {
    return {
      symbol,
      name: data.name || symbol,
      exchange: this.extractExchange(data) || 'US',
      industry: data.industry || undefined,
      marketCap: data.marketCapitalization || undefined,
      logo: data.logo || undefined,
      website: data.weburl || undefined,
      description: data.description || undefined,
      _source: this.name,
    };
  }

  /**
   * 提取交易所信息
   */
  private extractExchange(data: any): string {
    if (data.exchange) return data.exchange;
    if (data.listingExchange) return data.listingExchange;
    return 'US';
  }
}

// 导入 StockCodeValidator（从 config）
import { StockCodeValidator } from '../config';
