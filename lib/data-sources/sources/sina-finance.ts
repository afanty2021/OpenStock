/**
 * 新浪财经数据源适配器
 *
 * 支持港股、A股、美股的实时数据
 * 无需 API key，免费使用
 * @module data-sources/sources/sina-finance
 */

import { BaseDataSource } from '../base';
import type {
  DataSourceResult,
  QuoteDataType,
  ProfileDataType,
  SearchResultType,
  DataSourceCapabilities,
} from '../types';

const BASE_URL = 'https://hq.sinajs.cn';

/**
 * 新浪财经数据源
 * 支持港股、A股和美股的实时报价
 * 优先级: 港股1(首选), A股2(备用), 美股3(备用)
 */
export class SinaFinanceSource extends BaseDataSource {
  name = 'sinaFinance';
  priority = 2; // 港股首选

  capabilities: DataSourceCapabilities = {
    quote: true,
    profile: false,
    news: false,
    financials: false,
    markets: ['CN', 'HK', 'US'],
  };

  /**
   * 判断是否支持该股票代码
   * 支持港股、A 股和美股
   */
  supportsSymbol(symbol: string): boolean {
    // 港股：纯数字或带 .HK 后缀
    if (/^\d{4,5}$/.test(symbol) || /^\d{4,5}\.HK$/i.test(symbol)) {
      return true;
    }

    // A股：.SS, .SZ, .SH 后缀
    if (/\.(SS|SZ|SH|se)$/i.test(symbol)) {
      return true;
    }

    // 美股：纯字母
    if (/^[A-Za-z]+$/.test(symbol)) {
      return true;
    }

    return false;
  }

  /**
   * 获取新浪财经股票代码
   */
  private toSinaSymbol(symbol: string): string {
    // A股：sh600519 或 sz000001
    if (symbol.endsWith('.SS') || symbol.endsWith('.SH')) {
      return 'sh' + symbol.replace(/\.(SS|SH)$/i, '');
    }
    if (symbol.endsWith('.SZ') || symbol.endsWith('.se')) {
      return 'sz' + symbol.replace(/\.(SZ|se)$/i, '');
    }

    // 港股：rt_hk00005 或 hk00005
    if (symbol.endsWith('.HK')) {
      const code = symbol.replace(/\.HK$/i, '');
      return 'rt_hk' + code.padStart(5, '0');
    }
    if (/^\d{4,5}$/.test(symbol)) {
      return 'rt_hk' + symbol.padStart(5, '0');
    }

    // 美股：gb_apple (格式可能不同)
    // 新浪美股使用:美股前缀
    if (/^[A-Za-z]+$/.test(symbol)) {
      return 'gb_' + symbol.toLowerCase();
    }

    return symbol;
  }

  /**
   * 获取股票报价
   * 新浪 API 返回格式: var hq_str_sh600519="贵州茅台,1485.30,..."
   */
  async getQuote(symbol: string): Promise<DataSourceResult<QuoteDataType>> {
    const sinaSymbol = this.toSinaSymbol(symbol);
    const url = `${BASE_URL}/list=${sinaSymbol}`;

    const data = await this.fetchWithRetry(async () => {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://finance.sina.com.cn/',
        },
      });

      if (!res.ok) {
        throw new Error(`Fetch failed ${res.status}`);
      }

      const text = await res.text();

      // 新浪返回格式: var hq_str_sh600519="贵州茅台,1485.30,1485.00,..."
      const match = text.match(/hq_str_.+?="(.+?)"/);
      if (!match) {
        throw new Error('Invalid response format');
      }

      const values = match[1].split(',');
      return { symbol: sinaSymbol, values };
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
   * 获取公司资料（新浪不支持）
   */
  async getProfile(symbol: string): Promise<DataSourceResult<ProfileDataType>> {
    throw new Error('Sina Finance does not support profile data');
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
   * 新浪 API 返回格式（逗号分隔）：
   * 0: 名称, 1: 当前价, 2: 昨收价, 3: 当前价(再次), 4: 买一价,
   * 5: 卖一价, 6: 成交量, 7: 成交额, ...
   */
  private normalizeQuote(data: any, symbol: string): QuoteDataType {
    const values = data.values || [];

    const name = values[0] || '';
    const currentPrice = parseFloat(values[3]) || parseFloat(values[1]) || 0;
    const prevClose = parseFloat(values[2]) || 0;
    const change = currentPrice - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    // 新浪 API 对于不同市场返回的字段可能不同
    // 港股: 名称, 当前价, 昨收价, ...
    // A股: 名称, 当前价, 昨收价, ...
    // 美股: 名称, 当前价, 昨收价, ...

    return {
      symbol,
      c: currentPrice,
      d: change,
      dp: changePercent,
      h: 0, // 新浪 API 可能不返回
      l: 0, // 新浪 API 可能不返回
      o: 0, // 新浪 API 可能不返回
      pc: prevClose,
      t: Date.now() / 1000,
      v: parseInt(values[6]) || 0, // 成交量（手）
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
    if (values[0]) completeness += 10; // 名称
    if (values[1] || values[3]) completeness += 20; // 当前价
    if (values[2]) completeness += 15; // 昨收价
    if (values[6]) completeness += 15; // 成交量
    if (values[7]) completeness += 10; // 成交额

    const freshness = 92; // 实时数据，延迟低
    const reliability = 82; // 新浪财经，较可靠
    const total = (completeness + freshness + reliability) / 3;

    return {
      total: Math.round(total),
      completeness: Math.round(completeness),
      freshness: Math.round(freshness),
      reliability: Math.round(reliability),
    };
  }
}
