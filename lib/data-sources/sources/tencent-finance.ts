/**
 * 腾讯财经数据源适配器
 *
 * 支持港股、A股的实时数据
 * 无需 API key，免费使用
 * @module data-sources/sources/tencent-finance
 */

import { BaseDataSource } from '../base';
import type {
  DataSourceResult,
  QuoteDataType,
  ProfileDataType,
  SearchResultType,
  DataSourceCapabilities,
} from '../types';

const BASE_URL = 'https://qt.gtimg.cn';
const QUERY_URL = `${BASE_URL}/q`;

/**
 * 腾讯财经数据源
 * 支持港股和 A 股的实时报价
 * 优先级: 港股1(首选), A股2(备用)
 */
export class TencentFinanceSource extends BaseDataSource {
  name = 'tencentFinance';
  priority = 2; // 港股首选

  capabilities: DataSourceCapabilities = {
    quote: true,
    profile: false,
    news: false,
    financials: false,
    markets: ['CN', 'HK'],
  };

  private baseUrl = BASE_URL;
  private queryUrl = QUERY_URL;

  /**
   * 判断是否支持该股票代码
   * 支持港股和 A 股
   */
  supportsSymbol(symbol: string): boolean {
    // 港股：0xxx, 1xxx, 2xxx, 3xxx, 4xxx, 5xxx
    if (/^\d{4,5}\.HK$/i.test(symbol) || /^\d{4,5}$/.test(symbol)) {
      return true;
    }

    // A股：.SS, .SZ, .SH 后缀
    if (/\.(SS|SZ|SH|se)$/i.test(symbol)) {
      return true;
    }

    return false;
  }

  /**
   * 获取腾讯财经股票代码
   */
  private toTencentSymbol(symbol: string): string {
    // A股转换
    if (symbol.endsWith('.SS') || symbol.endsWith('.SH')) {
      return 'sh' + symbol.replace(/\.(SS|SH)$/i, '');
    }
    if (symbol.endsWith('.SZ') || symbol.endsWith('.se')) {
      return 'sz' + symbol.replace(/\.(SZ|se)$/i, '');
    }

    // 港股：去掉 .HK 后缀
    if (symbol.endsWith('.HK')) {
      return symbol.replace(/\.HK$/i, '');
    }

    // 纯数字视为港股
    if (/^\d{4,5}$/.test(symbol)) {
      return symbol;
    }

    return symbol;
  }

  /**
   * 获取股票报价
   * 腾讯 API 返回格式: v_sh600519="1.00,..." (类似格式)
   */
  async getQuote(symbol: string): Promise<DataSourceResult<QuoteDataType>> {
    const tencentSymbol = this.toTencentSymbol(symbol);
    const url = `${this.queryUrl}?${encodeURIComponent(tencentSymbol)}`;

    const data = await this.fetchWithRetry(async () => {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://stockapp.finance.qq.com/',
        },
      });

      if (!res.ok) {
        throw new Error(`Fetch failed ${res.status}`);
      }

      const text = await res.text();

      // 腾讯返回格式: v_sh600519="1485.30,0.00,..."
      const match = text.match(/v_["\s](.+?)="(.+?)"/);
      if (!match) {
        throw new Error('Invalid response format');
      }

      const values = match[2].split('~');
      return { symbol: match[1], values };
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
   * 获取公司资料（腾讯不支持）
   */
  async getProfile(symbol: string): Promise<DataSourceResult<ProfileDataType>> {
    throw new Error('Tencent Finance does not support profile data');
  }

  /**
   * 搜索股票（不支持）
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
   * 腾讯 API 返回格式（~分隔）：
   * 0: 当前价, 1: 昨收价, 2: ...
   */
  private normalizeQuote(data: any, symbol: string): QuoteDataType {
    const values = data.values || [];

    // 腾讯 API 的字段可能因市场而异
    // 港股格式: 当前价,昨收价,开盘价,最高价,最低价,买一价,卖一价,成交额,...
    // A股格式类似

    const currentPrice = parseFloat(values[0]) || 0;
    const prevClose = parseFloat(values[1]) || 0;
    const open = parseFloat(values[2]) || 0;
    const high = parseFloat(values[3]) || 0;
    const low = parseFloat(values[4]) || 0;
    const change = currentPrice - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
    // 成交量通常是较大的值（手数），腾讯 API 可能返回成交额
    const volume = parseInt(values[5]) || 0;

    return {
      symbol,
      c: currentPrice,
      d: change,
      dp: changePercent,
      h: high,
      l: low,
      o: open,
      pc: prevClose,
      t: Date.now() / 1000,
      v: volume,
      _source: this.name,
    };
  }

  /**
   * 创建质量评分
   */
  protected createQualityScore(data: any): { total: number; completeness: number; freshness: number; reliability: number } {
    let completeness = 0;
    const values = data.values || [];

    if (values.length > 0) completeness += 30;
    if (values[0]) completeness += 20; // 当前价
    if (values[1]) completeness += 15; // 昨收价
    if (values[2]) completeness += 15; // 开盘价
    if (values[3]) completeness += 10; // 最高价
    if (values[4]) completeness += 10; // 最低价

    const freshness = 95; // 实时数据
    const reliability = 85; // 腾讯财经，较可靠
    const total = (completeness + freshness + reliability) / 3;

    return {
      total: Math.round(total),
      completeness: Math.round(completeness),
      freshness: Math.round(freshness),
      reliability: Math.round(reliability),
    };
  }
}
