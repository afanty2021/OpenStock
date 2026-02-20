/**
 * Alpha Vantage 数据源适配器
 *
 * 美股的备用数据源，支持财务数据
 * @module data-sources/sources/alpha-vantage
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

const BASE_URL = 'https://www.alphavantage.co/query';
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY ?? '';

/**
 * Alpha Vantage 数据源
 * 美股的备用数据源，提供财务数据支持
 */
export class AlphaVantageSource extends BaseDataSource {
  name = 'alphaVantage';
  priority = 2; // 备用源

  capabilities: DataSourceCapabilities = {
    quote: true,
    profile: true,
    news: false,
    financials: true,
    markets: ['US'],
  };

  private baseUrl = BASE_URL;
  private apiKey = API_KEY;

  /**
   * 判断是否支持该股票代码
   * 主要支持美股
   */
  supportsSymbol(symbol: string): boolean {
    // 美股代码通常是纯字母
    return /^[A-Za-z]+$/.test(symbol);
  }

  /**
   * 获取股票报价
   */
  async getQuote(symbol: string): Promise<DataSourceResult<QuoteDataType>> {
    const data = await this.fetchWithRetry(async () => {
      if (!this.apiKey) {
        throw new Error('Alpha Vantage API key is not configured');
      }

      const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${this.apiKey}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Fetch failed ${res.status}`);
      }

      const json = await res.json();

      if (json['Error Message']) {
        throw new Error(json['Error Message']);
      }
      if (json['Note']) {
        throw new Error('API call frequency exceeded');
      }

      return json['Global Quote'];
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
        throw new Error('Alpha Vantage API key is not configured');
      }

      const url = `${this.baseUrl}?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${this.apiKey}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Fetch failed ${res.status}`);
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
   * 获取财务数据
   */
  async getFinancials(symbol: string): Promise<DataSourceResult<FinancialDataType>> {
    const data = await this.fetchWithRetry(async () => {
      if (!this.apiKey) {
        throw new Error('Alpha Vantage API key is not configured');
      }

      const url = `${this.baseUrl}?function=INCOME_STATEMENT&symbol=${encodeURIComponent(symbol)}&apikey=${this.apiKey}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Fetch failed ${res.status}`);
      }

      return res.json();
    });

    if (!data) {
      throw new Error('Failed to fetch financials after retries');
    }

    return {
      data: this.normalizeFinancials(data, symbol),
      quality: this.createQualityScore(data),
      timestamp: Date.now(),
    };
  }

  /**
   * 搜索股票（Alpha Vantage 不支持）
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
   * Alpha Vantage GLOBAL_QUOTE 返回格式
   */
  private normalizeQuote(data: any, symbol: string): QuoteDataType {
    return {
      symbol,
      c: parseFloat(data['05. price']) || 0,
      d: parseFloat(data['09. change']) || 0,
      dp: parseFloat(data['10. change percent'].replace('%', '')) || 0,
      h: parseFloat(data['03. high']) || 0,
      l: parseFloat(data['04. low']) || 0,
      o: parseFloat(data['02. open']) || 0,
      pc: parseFloat(data['08. previous close']) || 0,
      t: Date.now() / 1000, // Alpha Vantage 不提供精确时间戳
      _source: this.name,
    };
  }

  /**
   * 规范化公司资料数据
   */
  private normalizeProfile(data: any, symbol: string): ProfileDataType {
    return {
      symbol,
      name: data['Symbol'] || symbol,
      exchange: data['Exchange'] || 'US',
      industry: data['Sector'] || undefined,
      marketCap: data['MarketCapitalization'] ? parseFloat(data['MarketCapitalization']) : undefined,
      logo: undefined,
      website: undefined,
      description: data['Description'] || undefined,
      _source: this.name,
    };
  }

  /**
   * 规范化财务数据
   */
  private normalizeFinancials(data: any, symbol: string): FinancialDataType {
    const annualReports = data.annualReports;
    if (!annualReports || annualReports.length === 0) {
      return {
        symbol,
        period: '',
        revenue: undefined,
        netIncome: undefined,
        totalAssets: undefined,
        totalLiabilities: undefined,
        eps: undefined,
        roe: undefined,
        _source: this.name,
      };
    }

    const latest = annualReports[0];
    return {
      symbol,
      period: latest.fiscalDateEnding,
      revenue: parseFloat(latest.totalRevenue),
      netIncome: parseFloat(latest.netIncome),
      totalAssets: undefined, // 需要调用 BALANCE_SHEET 获取
      totalLiabilities: undefined,
      eps: parseFloat(latest.eps),
      roe: undefined,
      _source: this.name,
    };
  }
}
