/**
 * Tushare 数据源适配器
 *
 * A 股和港股的主要数据源，支持财务数据
 * @module data-sources/sources/tushare
 */

import { BaseDataSource } from '../base';
import type {
  DataSourceResult,
  DataSourceCapabilities,
  QuoteData,
  ProfileData,
  FinancialData,
  SearchResult,
} from '../types';
import { StockCodeValidator } from '../config';

// 类型别名，简化代码中的类型声明
type QuoteDataType = {
  symbol: string;
  c: number;
  d: number;
  dp: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
  t?: number;
  _source: string;
  [key: string]: any;
};

type ProfileDataType = {
  symbol: string;
  name: string;
  exchange: string;
  industry?: string;
  marketCap?: number;
  logo?: string;
  website?: string;
  description?: string;
  _source: string;
  [key: string]: any;
};

type FinancialDataType = {
  symbol: string;
  period: string;
  revenue?: number;
  netIncome?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  eps?: number;
  roe?: number;
  _source: string;
  [key: string]: any;
};

type SearchResultType = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  [key: string]: any;
};

const API_URL = 'http://api.tushare.pro';
const API_TOKEN = process.env.TUSHARE_API_TOKEN ?? '';

/**
 * Tushare API 响应格式
 * Tushare 返回数组格式的数据，需要转换
 */
interface TushareResponse<T = any> {
  code: number; // 0 表示成功
  msg: string; // 错误信息
  data: {
    fields: string[]; // 字段名数组
    items: T[][]; // 数据数组（每行是一个数组）
  };
}

/**
 * 龙虎榜数据
 */
export interface TopListData {
  ts_code: string;        // 股票代码
  name: string;           // 股票名称
  reason: string;         // 上榜理由
  buy_amount: number;     // 买入金额
  sell_amount: number;    // 卖出金额
  net_amount: number;     // 净买入金额
}

/**
 * 资金流向数据
 */
export interface MoneyFlowData {
  ts_code: string;
  buy_elg_vol?: number;   // 买入量
  sell_elg_vol?: number;  // 卖出量
  buy_lg_vol?: number;    // 大单买入
  sell_lg_vol?: number;   // 大单卖出
  net_mf_vol?: number;    // 净流入
}

/**
 * 每日指标数据
 */
export interface DailyBasicData {
  ts_code: string;
  pe_ttm?: number;        // 市盈率 TTM
  pb?: number;            // 市净率
  ps_ttm?: number;        // 市销率
  pcf_ratio?: number;     // 市现率
  turnover?: number;      // 换手率
  volume_ratio?: number;  // 量比
  total_mv?: number;      // 总市值
  circ_mv?: number;       // 流通市值
}

/**
 * 数据转换工具函数
 * 将 Tushare 的数组格式转换为对象数组
 */
function transformTushareData<T extends Record<string, any>>(
  response: TushareResponse
): T[] {
  if (!response.data || !response.data.fields || !response.data.items) {
    return [];
  }

  const { fields, items } = response.data;

  return items.map(item =>
    fields.reduce((obj: Record<string, any>, field, i) => {
      obj[field] = item[i];
      return obj;
    }, {}) as T
  );
}

/**
 * Tushare 数据源
 * 支持A股和港股的实时报价、公司资料和财务数据
 */
export class TushareSource extends BaseDataSource {
  name = 'tushare';
  priority = 1; // A 股首选

  capabilities: DataSourceCapabilities = {
    quote: true,
    profile: true,
    news: false,
    financials: true, // 强项
    markets: ['CN', 'HK'],
  };

  private apiUrl = API_URL;
  private token = API_TOKEN;

  /**
   * 判断是否支持该股票代码
   * 支持 A 股和港股
   */
  supportsSymbol(symbol: string): boolean {
    return StockCodeValidator.isAStock(symbol) ||
           StockCodeValidator.isHKStock(symbol);
  }

  /**
   * 获取股票报价
   */
  async getQuote(symbol: string): Promise<DataSourceResult<QuoteDataType>> {
    const tsCode = StockCodeValidator.toTushareCode(symbol);

    const data = await this.fetchWithRetry(async () => {
      if (!this.token) {
        throw new Error('Tushare API token is not configured');
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'daily',
          token: this.token,
          params: {
            ts_code: tsCode,
          },
          fields: 'ts_code,trade_date,open,high,low,close,pre_close,vol,amount'
        })
      });

      const result: TushareResponse = await response.json();

      if (result.code !== 0) {
        throw new Error(result.msg || 'Tushare API error');
      }

      // 转换数组格式为对象
      const records = transformTushareData<any>(result);
      if (records.length === 0) {
        throw new Error('No data available');
      }

      return records[0];
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
    const tsCode = StockCodeValidator.toTushareCode(symbol);

    const data = await this.fetchWithRetry(async () => {
      if (!this.token) {
        throw new Error('Tushare API token is not configured');
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'daily_basic',
          token: this.token,
          params: {
            ts_code: tsCode,
            trade_date: this.getLatestTradeDate(),
          },
          fields: 'ts_code,trade_date,turnover_rate,volume_ratio,pe,pb'
        })
      });

      const result: TushareResponse = await response.json();

      if (result.code !== 0) {
        throw new Error(result.msg || 'Tushare API error');
      }

      const records = transformTushareData<any>(result);
      return records[0] || {};
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
    const tsCode = StockCodeValidator.toTushareCode(symbol);

    const data = await this.fetchWithRetry(async () => {
      if (!this.token) {
        throw new Error('Tushare API token is not configured');
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'fina_indicator_bs',
          token: this.token,
          params: {
            ts_code: tsCode,
            period: '20241231', // 最新报告期
          },
        })
      });

      const result: TushareResponse = await response.json();

      if (result.code !== 0) {
        throw new Error(result.msg || 'Tushare API error');
      }

      const records = transformTushareData<any>(result);
      return records[0] || {};
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
   * 搜索股票（Tushare 不支持，返回空）
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
   * Tushare 字段：open, high, low, close, pre_close, vol, amount
   */
  private normalizeQuote(data: any, symbol: string): QuoteDataType {
    return {
      symbol,
      c: data.close || 0,
      d: (data.close || 0) - (data.pre_close || 0), // 涨跌额
      dp: ((data.close || 0) - (data.pre_close || 0)) / (data.pre_close || 1) * 100, // 涨跌幅
      h: data.high || 0,
      l: data.low || 0,
      o: data.open || 0,
      pc: data.pre_close || 0,
      t: Date.now() / 1000, // Tushare 不提供精确时间戳
      _source: this.name,
    };
  }

  /**
   * 规范化公司资料数据
   */
  private normalizeProfile(data: any, symbol: string): ProfileDataType {
    return {
      symbol,
      name: this.getStockName(symbol),
      exchange: this.getExchange(symbol),
      industry: undefined,
      marketCap: undefined,
      logo: undefined,
      website: undefined,
      description: undefined,
      _source: this.name,
    };
  }

  /**
   * 规范化财务数据
   */
  private normalizeFinancials(data: any, symbol: string): FinancialDataType {
    return {
      symbol,
      period: data.end_date || '20241231',
      revenue: data.total_revenue,
      netIncome: data.n_income,
      totalAssets: data.total_assets,
      totalLiabilities: data.total_liability,
      eps: data.basic_eps,
      roe: data.roe,
      _source: this.name,
    };
  }

  /**
   * 获取最新交易日期（Tushare 格式：YYYYMMDD）
   *
   * 回退到最近的过去交易日，避免使用未来日期
   */
  private getLatestTradeDate(): string {
    let date = new Date();

    // 获取星期几（0=周日, 6=周六）
    const dayOfWeek = date.getDay();

    // 如果是周日（0），回退 2 天到周五
    if (dayOfWeek === 0) {
      date.setDate(date.getDate() - 2);
    }
    // 如果是周六（6），回退 1 天到周五
    else if (dayOfWeek === 6) {
      date.setDate(date.getDate() - 1);
    }

    // 如果当前时间较早（凌晨），可能市场还没开盘，使用前一天的日期
    const hour = date.getHours();
    if (hour < 9) {
      date.setDate(date.getDate() - 1);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * 获取股票名称（简化版本）
   */
  private getStockName(symbol: string): string {
    // 简化实现，实际可以从 name 接口获取
    return symbol;
  }

  /**
   * 获取交易所
   */
  private getExchange(symbol: string): string {
    if (symbol.includes('.SH')) return 'SH';
    if (symbol.includes('.SZ')) return 'SZ';
    if (symbol.includes('.HK')) return 'HK';
    return 'CN';
  }

  /**
   * 获取龙虎榜数据
   * 接口：top_list
   *
   * @param date 交易日期（可选，格式：YYYYMMDD）
   * @returns 龙虎榜数据数组
   */
  async getTopList(date?: string): Promise<TopListData[]> {
    const tradeDate = date || this.getLatestTradeDate();

    const data = await this.fetchWithRetry(async () => {
      if (!this.token) {
        throw new Error('Tushare API token is not configured');
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'top_list',
          token: this.token,
          params: { trade_date: tradeDate },
          fields: 'ts_code,name,reason,buy_amount,sell_amount,net_amount'
        })
      });

      const result: TushareResponse = await response.json();

      if (result.code !== 0) {
        throw new Error(result.msg || 'Tushare API error');
      }

      return transformTushareData<TopListData>(result);
    });

    if (!data) {
      throw new Error('Failed to fetch top list after retries');
    }

    return data;
  }

  /**
   * 获取资金流向数据
   * 接口：moneyflow
   *
   * @param symbol 股票代码（如 600519.SS 或 600519）
   * @param tradeDate 交易日期（可选，格式：YYYYMMDD）
   * @returns 资金流向数据
   */
  async getMoneyFlow(symbol: string, tradeDate?: string): Promise<MoneyFlowData> {
    const tsCode = StockCodeValidator.toTushareCode(symbol);
    const date = tradeDate || this.getLatestTradeDate();

    const data = await this.fetchWithRetry(async () => {
      if (!this.token) {
        throw new Error('Tushare API token is not configured');
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'moneyflow',
          token: this.token,
          params: { ts_code: tsCode, trade_date: date },
          fields: 'ts_code,trade_date,buy_elg_vol,sell_elg_vol,buy_lg_vol,sell_lg_vol,net_mf_vol'
        })
      });

      const result: TushareResponse = await response.json();

      if (result.code !== 0) {
        throw new Error(result.msg || 'Tushare API error');
      }

      const records = transformTushareData<MoneyFlowData>(result);
      if (records.length === 0) {
        throw new Error('No money flow data available');
      }

      return records[0];
    });

    if (!data) {
      throw new Error('Failed to fetch money flow after retries');
    }

    return data;
  }

  /**
   * 获取每日指标数据
   * 接口：daily_basic (PE、PB、换手率等)
   *
   * @param symbol 股票代码（如 600519.SS 或 600519）
   * @param tradeDate 交易日期（可选，格式：YYYYMMDD）
   * @returns 每日指标数据
   */
  async getDailyBasic(symbol: string, tradeDate?: string): Promise<DailyBasicData> {
    const tsCode = StockCodeValidator.toTushareCode(symbol);
    const date = tradeDate;

    const data = await this.fetchWithRetry(async () => {
      if (!this.token) {
        throw new Error('Tushare API token is not configured');
      }

      // 构建请求参数
      const params: any = { ts_code: tsCode };
      if (date) {
        params.trade_date = date;
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'daily_basic',
          token: this.token,
          params: params,
          fields: 'ts_code,trade_date,pe_ttm,pb,ps_ttm,pcf_ratio,turnover,volume_ratio,total_mv,circ_mv'
        })
      });

      const result: TushareResponse = await response.json();

      if (result.code !== 0) {
        throw new Error(result.msg || 'Tushare API error');
      }

      const records = transformTushareData<DailyBasicData>(result);
      if (records.length === 0) {
        throw new Error('No daily basic data available');
      }

      // 如果没有指定日期，返回最新的一条记录
      return date ? records[0] : records[0];
    });

    if (!data) {
      throw new Error('Failed to fetch daily basic after retries');
    }

    return data;
  }
}
