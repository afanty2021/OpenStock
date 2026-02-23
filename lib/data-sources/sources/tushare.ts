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
import { TradingCalendar } from '../astock';

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
 * 资金流向数据（完整版）
 *
 * Tushare moneyflow 接口返回的资金流向数据
 * 包含主力、超大单、大单、中单、小单的买卖量和净额
 */
export interface MoneyFlowData {
  ts_code: string;          // 股票代码
  trade_date: string;       // 交易日期

  // 主力净流入
  net_mf_vol?: number;      // 主力净流入量(手)
  net_mf_amount?: number;   // 主力净流入额(万元)

  // 超大单(>=100万元)
  net_buy_mf_vol?: number;  // 超大单净买入量(手)
  net_buy_mf_amount?: number; // 超大单净买入额(万元)

  // 大单(20-100万元)
  net_buy_elg_vol?: number;   // 大单净买入量(手)
  net_buy_elg_amount?: number; // 大单净买入额(万元)

  // 中单(5-20万元)
  net_buy_nr_vol?: number;   // 中单净买入量(手)
  net_buy_nr_amount?: number; // 中单净买入额(万元)

  // 小单(<5万元，散户)
  net_buy_lg_vol?: number;   // 小单净买入量(手)
  net_buy_lg_amount?: number; // 小单净买入额(万元)

  // 以下是详细分类字段（保留向后兼容）
  buy_elg_vol?: number;   // 大单买入量(手)
  sell_elg_vol?: number;  // 大单卖出量(手)
  buy_lg_vol?: number;    // 小单买入量(手)
  sell_lg_vol?: number;   // 小单卖出量(手)
}

/**
 * 资金流向查询选项
 */
export interface MoneyFlowOptions {
  /** 股票代码（如 600519.SH 或 600519） */
  tsCode: string;

  /** 开始日期（格式：YYYYMMDD） */
  startDate?: string;

  /** 结束日期（格式：YYYYMMDD） */
  endDate?: string;

  /** 返回条数限制 */
  limit?: number;
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
 * 板块交易数据
 *
 * Tushare block_trade 接口返回的板块交易数据
 * 包含板块指数的涨跌幅、成交额和资金流向数据
 */
export interface BlockTradeData {
  ts_code: string;          // 板块代码
  trade_date: string;       // 交易日期
  name: string;             // 板块名称
  close: number;            // 收盘点位
  pct_chg: number;          // 涨跌幅(%)
  amount: number;           // 成交额(万元)
  net_mf_amount: number;    // 主力净流入(万元)
}

/**
 * 板块交易查询选项
 */
export interface BlockTradeOptions {
  /** 板块代码（可选） */
  tsCode?: string;

  /** 交易日期（格式：YYYYMMDD），默认为最新交易日 */
  tradeDate?: string;

  /** 返回条数限制 */
  limit?: number;
}

/**
 * 概念板块成分股
 */
export interface ConceptDetailData {
  ts_code: string;          // 股票代码
  name: string;             // 股票名称
  in_date: string;          // 纳入日期
  out_date?: string;        // 剔除日期（可选）
}

/**
 * 行业分类数据
 */
export interface IndexClassifyData {
  index_code: string;       // 指数代码
  con_code: string;         // 成分股代码
  in_date: string;          // 纳入日期
  out_date?: string;        // 剔除日期（可选）
  new_ratio?: number;       // 最新权重（可选）
}

/**
 * 融资融券明细数据
 *
 * Tushare margin_detail 接口返回的融资融券交易数据
 * 包含融资余额、融资买入额、融券余额、融券卖出量等字段
 */
export interface MarginDetailData {
  ts_code: string;          // 股票代码
  trade_date: string;       // 交易日期

  // 融资相关
  rz_ratio: number;         // 融资余额(万元) - 投资者借钱买入股票的总金额
  rz_che: number;           // 融资买入额(万元) - 当日新增融资买入金额
  rz_ch: number;            // 融资偿还额(万元) - 当日偿还融资金额

  // 融券相关
  rq_ratio: number;         // 融券余额(万元) - 投资者借股票卖出的总市值
  rq_che: number;           // 融券卖出量(手) - 当日新增融券卖出量
  rq_ch: number;            // 融券偿还量(手) - 当日偿还融券数量

  // 比率指标
  rz_rq_ratio: number;      // 融资融券余额比 = 融资余额 / 融券余额
}

/**
 * 财经新闻数据
 *
 * Tushare news 接口返回的财经新闻数据
 * 包含新闻标题、内容、来源、发布时间等信息
 */
export interface NewsData {
  id: string;              // 新闻ID
  title: string;           // 新闻标题
  content: string;         // 新闻内容（摘要）
  source: string;          // 新闻来源
  pub_time: string;        // 发布时间（格式：YYYY-MM-DD HH:MM:SS）
  url: string;             // 原文链接
  related_stocks?: string[]; // 相关股票代码
}

/**
 * 财经新闻查询选项
 */
export interface NewsOptions {
  /** 新闻来源（可选） */
  source?: string;

  /** 开始日期（格式：YYYYMMDD） */
  startDate?: string;

  /** 结束日期（格式：YYYYMMDD） */
  endDate?: string;

  /** 返回条数限制 */
  limit?: number;
}

/**
 * 融资融券查询选项
 */
export interface MarginDetailOptions {
  /** 股票代码（如 600519.SH 或 600519） */
  tsCode: string;

  /** 开始日期（格式：YYYYMMDD） */
  startDate?: string;

  /** 结束日期（格式：YYYYMMDD） */
  endDate?: string;

  /** 返回条数限制 */
  limit?: number;
}

/**
 * 股票所属行业信息
 *
 * 用于展示股票所属板块
 */
export interface StockIndustry {
  tsCode: string;          // 股票代码
  name: string;            // 股票名称
  industry: string;        // 所属行业（申万一级行业）
  industrySecond: string;  // 申万二级行业
  industryThird: string;   // 申万三级行业
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

  /**
   * API Token
   * 从环境变量读取
   */
  private token = process.env.TUSHARE_API_TOKEN ?? '';

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

    // fetchWithRetry 会在全部重试失败后抛出原始错误
    // 不需要检查 null，直接使用返回值
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
        // 保留原始错误信息，便于调试和问题追踪
        const originalError = result.msg || 'Unknown error';
        throw new Error(`Tushare API error (code: ${result.code}): ${originalError}`);
      }

      // 转换数组格式为对象
      const records = transformTushareData<any>(result);
      if (records.length === 0) {
        throw new Error('No data available');
      }

      return records[0];
    });

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

    // fetchWithRetry 会在全部重试失败后抛出原始错误
    // 不需要检查 null，直接使用返回值
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
        // 保留原始错误信息，便于调试和问题追踪
        const originalError = result.msg || 'Unknown error';
        throw new Error(`Tushare API error (code: ${result.code}): ${originalError}`);
      }

      const records = transformTushareData<any>(result);
      return records[0] || {};
    });

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

    // fetchWithRetry 会在全部重试失败后抛出原始错误
    // 不需要检查 null，直接使用返回值
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
        // 保留原始错误信息，便于调试和问题追踪
        const originalError = result.msg || 'Unknown error';
        throw new Error(`Tushare API error (code: ${result.code}): ${originalError}`);
      }

      const records = transformTushareData<any>(result);
      return records[0] || {};
    });

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
   * 完全委托给 TradingCalendar 获取最近的交易日
   * 如果今天不是交易日，使用 TradingCalendar 的前向查找逻辑
   */
  private getLatestTradeDate(): string {
    const today = new Date();
    const date = TradingCalendar.isTradingDay(today)
      ? today
      : this.getPreviousTradingDay(today);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * 获取前一个交易日（用于查找最近的交易日）
   * @param date 起始日期
   * @returns 前一个交易日
   * @private
   */
  private getPreviousTradingDay(date: Date): Date {
    const prevDay = new Date(date);
    // 最多向前查找 7 天（一周内必定有交易日）
    for (let i = 0; i < 7; i++) {
      prevDay.setDate(prevDay.getDate() - 1);
      if (TradingCalendar.isTradingDay(prevDay)) {
        return prevDay;
      }
    }
    return prevDay; // 默认返回最后检查的日期
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
   * 支持历史查询、股票代码过滤和结果限制
   *
   * @param options 查询选项
   * @param options.tsCode 股票代码（如 600519.SH 或 600519）
   * @param options.tradeDate 交易日期（格式：YYYYMMDD），默认为最新交易日
   * @param options.limit 返回条数限制
   * @returns 龙虎榜数据数组
   *
   * @example
   * ```ts
   * // 获取当日龙虎榜
   * const today = await tushare.getTopList();
   *
   * // 获取指定日期龙虎榜
   * const historical = await tushare.getTopList({ tradeDate: '20260220' });
   *
   * // 获取指定股票的龙虎榜历史
   * const stockTopList = await tushare.getTopList({ tsCode: '600519.SH' });
   *
   * // 获取指定日期的TOP10
   * const top10 = await tushare.getTopList({ tradeDate: '20260220', limit: 10 });
   * ```
   */
  async getTopList(options?: { tsCode?: string; tradeDate?: string; limit?: number }): Promise<TopListData[]> {
    // 如果没有指定日期，使用最新交易日
    const queryDate = options?.tradeDate || this.getLatestTradeDate();

    // 使用 TradingCalendar 验证日期格式和交易日有效性
    if (!this.isValidTradeDate(queryDate)) {
      return [];
    }

    // 转换股票代码格式
    const queryTsCode = options?.tsCode ? StockCodeValidator.toTushareCode(options.tsCode) : undefined;

    // fetchWithRetry 会在全部重试失败后抛出原始错误
    // 不需要检查 null，直接使用返回值
    const data = await this.fetchWithRetry(async () => {
      if (!this.token) {
        throw new Error('Tushare API token is not configured');
      }

      // 构建请求参数
      const params: Record<string, string> = { trade_date: queryDate };
      if (queryTsCode) {
        params.ts_code = queryTsCode;
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'top_list',
          token: this.token,
          params,
          fields: 'ts_code,name,reason,buy_amount,sell_amount,net_amount'
        })
      });

      const result: TushareResponse = await response.json();

      if (result.code !== 0) {
        // 保留原始错误信息，便于调试和问题追踪
        const originalError = result.msg || 'Unknown error';
        throw new Error(`Tushare API error (code: ${result.code}): ${originalError}`);
      }

      return transformTushareData<TopListData>(result);
    });

    // 应用 limit 限制
    // limit > 0: 返回前 N 条记录
    // limit <= 0 或 undefined: 返回所有记录（无限制）
    const limit = options?.limit;
    if (limit && limit > 0 && data.length > limit) {
      return data.slice(0, limit);
    }

    return data;
  }

  /**
   * 验证交易日期格式和有效性
   * 完全委托给 TradingCalendar 验证日期格式和交易日有效性
   *
   * @param date 日期字符串（YYYYMMDD 格式）
   * @returns 是否为有效交易日期格式
   * @private
   */
  private isValidTradeDate(date: string): boolean {
    // 检查格式：8位数字
    if (!/^\d{8}$/.test(date)) {
      return false;
    }

    // 解析日期
    const year = parseInt(date.substring(0, 4), 10);
    const month = parseInt(date.substring(4, 6), 10);
    const day = parseInt(date.substring(6, 8), 10);

    // 添加日期范围验证（2000-当前年份+1）
    // A 股市场于 2000 年后逐步完善，之前的日期数据不完整
    const currentYear = new Date().getFullYear();
    if (year < 2000 || year > currentYear + 1) {
      return false;
    }

    const testDate = new Date(year, month - 1, day);

    // 检查日期解析有效性
    if (
      testDate.getFullYear() !== year ||
      testDate.getMonth() !== month - 1 ||
      testDate.getDate() !== day
    ) {
      return false;
    }

    // 完全委托给 TradingCalendar 检查是否为交易日
    return TradingCalendar.isTradingDay(testDate);
  }

  /**
   * 获取资金流向数据
   * 接口：moneyflow
   *
   * 支持单日查询、日期范围查询和批量查询
   *
   * @param options 查询选项
   * @param options.tsCode 股票代码（如 600519.SH 或 600519）
   * @param options.startDate 开始日期（格式：YYYYMMDD），默认为最新交易日
   * @param options.endDate 结束日期（格式：YYYYMMDD），默认与 startDate 相同
   * @param options.limit 返回条数限制
   * @returns 资金流向数据数组
   *
   * @example
   * ```ts
   * // 获取当日资金流向
   * const today = await tushare.getMoneyFlow({ tsCode: '600519.SH' });
   *
   * // 获取指定日期资金流向
   * const singleDay = await tushare.getMoneyFlow({
   *   tsCode: '600519.SH',
   *   startDate: '20260220',
   *   endDate: '20260220',
   * });
   *
   * // 获取日期范围资金流向
   * const range = await tushare.getMoneyFlow({
   *   tsCode: '600519.SH',
   *   startDate: '20260201',
   *   endDate: '20260220',
   * });
   *
   * // 获取最近10天资金流向
   * const recent10 = await tushare.getMoneyFlow({
   *   tsCode: '600519.SH',
   *   limit: 10,
   * });
   * ```
   */
  async getMoneyFlow(options: MoneyFlowOptions): Promise<MoneyFlowData[]> {
    const tsCode = StockCodeValidator.toTushareCode(options.tsCode);
    const startDate = options.startDate || this.getLatestTradeDate();
    const endDate = options.endDate || startDate;

    // 验证日期格式
    if (!this.isValidTradeDate(startDate)) {
      throw new Error(`Invalid start date: ${startDate}. Must be a valid trading date in YYYYMMDD format.`);
    }
    if (endDate && !this.isValidTradeDate(endDate)) {
      throw new Error(`Invalid end date: ${endDate}. Must be a valid trading date in YYYYMMDD format.`);
    }

    // fetchWithRetry 会在全部重试失败后抛出原始错误
    // 不需要检查 null，直接使用返回值
    const data = await this.fetchWithRetry(async () => {
      if (!this.token) {
        throw new Error('Tushare API token is not configured');
      }

      // 构建请求参数
      const params: Record<string, string> = {
        ts_code: tsCode,
        start_date: startDate,
      };

      if (endDate) {
        params.end_date = endDate;
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'moneyflow',
          token: this.token,
          params,
          fields: [
            'ts_code',
            'trade_date',
            // 主力净流入
            'net_mf_vol',
            'net_mf_amount',
            // 超大单
            'net_buy_mf_vol',
            'net_buy_mf_amount',
            // 大单
            'net_buy_elg_vol',
            'net_buy_elg_amount',
            // 中单
            'net_buy_nr_vol',
            'net_buy_nr_amount',
            // 小单
            'net_buy_lg_vol',
            'net_buy_lg_amount',
          ].join(','),
        })
      });

      const result: TushareResponse = await response.json();

      if (result.code !== 0) {
        // 保留原始错误信息，便于调试和问题追踪
        const originalError = result.msg || 'Unknown error';
        throw new Error(`Tushare API error (code: ${result.code}): ${originalError}`);
      }

      const records = transformTushareData<MoneyFlowData>(result);
      if (records.length === 0) {
        throw new Error('No money flow data available');
      }

      return records;
    });

    // 应用 limit 限制
    // limit > 0: 返回前 N 条记录
    // limit <= 0 或 undefined: 返回所有记录（无限制）
    const limit = options.limit;
    if (limit && limit > 0 && data.length > limit) {
      return data.slice(0, limit);
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

    // fetchWithRetry 会在全部重试失败后抛出原始错误
    // 不需要检查 null，直接使用返回值
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
        // 保留原始错误信息，便于调试和问题追踪
        const originalError = result.msg || 'Unknown error';
        throw new Error(`Tushare API error (code: ${result.code}): ${originalError}`);
      }

      const records = transformTushareData<DailyBasicData>(result);
      if (records.length === 0) {
        throw new Error('No daily basic data available');
      }

      // 如果没有指定日期，返回最新的一条记录
      return date ? records[0] : records[0];
    });

    return data;
  }

  /**
   * 获取板块交易数据
   * 接口：block_trade
   *
   * 支持行业板块和概念板块的查询
   *
   * @param options 查询选项
   * @param options.tsCode 板块代码（如 801010.SH 代表申万一级行业）
   * @param options.tradeDate 交易日期（格式：YYYYMMDD），默认为最新交易日
   * @param options.limit 返回条数限制
   * @returns 板块交易数据数组
   *
   * @example
   * ```ts
   * // 获取当日所有板块交易数据
   * const today = await tushare.getBlockTrade();
   *
   * // 获取指定日期板块交易数据
   * const historical = await tushare.getBlockTrade({ tradeDate: '20260220' });
   *
   * // 获取指定板块交易数据
   * const sector = await tushare.getBlockTrade({ tsCode: '801010.SH' });
   *
   * // 获取当日TOP10板块
   * const top10 = await tushare.getBlockTrade({ limit: 10 });
   * ```
   */
  async getBlockTrade(options?: BlockTradeOptions): Promise<BlockTradeData[]> {
    // 如果没有指定日期，使用最新交易日
    const queryDate = options?.tradeDate || this.getLatestTradeDate();

    // 使用 TradingCalendar 验证日期格式和交易日有效性
    if (!this.isValidTradeDate(queryDate)) {
      return [];
    }

    // 转换股票代码格式（如果提供）
    const queryTsCode = options?.tsCode ? StockCodeValidator.toTushareCode(options.tsCode) : undefined;

    // fetchWithRetry 会在全部重试失败后抛出原始错误
    // 不需要检查 null，直接使用返回值
    const data = await this.fetchWithRetry(async () => {
      if (!this.token) {
        throw new Error('Tushare API token is not configured');
      }

      // 构建请求参数
      const params: Record<string, string> = { trade_date: queryDate };
      if (queryTsCode) {
        params.ts_code = queryTsCode;
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'block_trade',
          token: this.token,
          params,
          fields: 'ts_code,trade_date,name,close,pct_chg,amount,net_mf_amount'
        })
      });

      const result: TushareResponse = await response.json();

      if (result.code !== 0) {
        // 保留原始错误信息，便于调试和问题追踪
        const originalError = result.msg || 'Unknown error';
        throw new Error(`Tushare API error (code: ${result.code}): ${originalError}`);
      }

      return transformTushareData<BlockTradeData>(result);
    });

    // 应用 limit 限制
    // limit > 0: 返回前 N 条记录
    // limit <= 0 或 undefined: 返回所有记录（无限制）
    const limit = options?.limit;
    if (limit && limit > 0 && data.length > limit) {
      return data.slice(0, limit);
    }

    return data;
  }

  /**
   * 获取概念板块成分股
   * 接口：concept_detail
   *
   * @param conceptId 概念板块代码（如 TS001 代表新能源汽车概念）
   * @returns 成分股代码数组
   *
   * @example
   * ```ts
   * // 获取新能源汽车概念成分股
   * const stocks = await tushare.getConceptDetail('TS001');
   * console.log(stocks); // ['600519.SH', '000001.SZ', ...]
   * ```
   */
  async getConceptDetail(conceptId: string): Promise<string[]> {
    // fetchWithRetry 会在全部重试失败后抛出原始错误
    // 不需要检查 null，直接使用返回值
    const data = await this.fetchWithRetry(async () => {
      if (!this.token) {
        throw new Error('Tushare API token is not configured');
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'concept_detail',
          token: this.token,
          params: { id: conceptId },
          fields: 'ts_code,name,in_date,out_date'
        })
      });

      const result: TushareResponse = await response.json();

      if (result.code !== 0) {
        // 保留原始错误信息，便于调试和问题追踪
        const originalError = result.msg || 'Unknown error';
        throw new Error(`Tushare API error (code: ${result.code}): ${originalError}`);
      }

      return transformTushareData<ConceptDetailData>(result);
    });

    // 过滤出未剔除的股票（out_date 为空），并返回股票代码数组
    const activeStocks = data
      .filter(item => !item.out_date)
      .map(item => item.ts_code);

    return activeStocks;
  }

  /**
   * 获取行业分类成分股
   * 接口：index_classify
   *
   * @param indexCode 行业指数代码（如 801010.SH 代表申万一级行业-农林牧渔）
   * @returns 成分股代码数组
   *
   * @example
   * ```ts
   * // 获取申万一级行业-农林牧渔成分股
   * const stocks = await tushare.getIndexClassify('801010.SH');
   * console.log(stocks); // ['600519.SH', '000001.SZ', ...]
   * ```
   */
  async getIndexClassify(indexCode: string): Promise<string[]> {
    // 转换股票代码格式
    const queryIndexCode = StockCodeValidator.toTushareCode(indexCode);

    // fetchWithRetry 会在全部重试失败后抛出原始错误
    // 不需要检查 null，直接使用返回值
    const data = await this.fetchWithRetry(async () => {
      if (!this.token) {
        throw new Error('Tushare API token is not configured');
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'index_classify',
          token: this.token,
          params: { index_code: queryIndexCode },
          fields: 'index_code,con_code,in_date,out_date,new_ratio'
        })
      });

      const result: TushareResponse = await response.json();

      if (result.code !== 0) {
        // 保留原始错误信息，便于调试和问题追踪
        const originalError = result.msg || 'Unknown error';
        throw new Error(`Tushare API error (code: ${result.code}): ${originalError}`);
      }

      return transformTushareData<IndexClassifyData>(result);
    });

    // 过滤出未剔除的股票（out_date 为空），并返回股票代码数组
    const activeStocks = data
      .filter(item => !item.out_date)
      .map(item => item.con_code);

    return activeStocks;
  }

  /**
   * 获取融资融券明细数据
   * 接口：margin_detail
   *
   * 支持单日查询、日期范围查询和批量查询
   *
   * @param options 查询选项
   * @param options.tsCode 股票代码（如 600519.SH 或 600519）
   * @param options.startDate 开始日期（格式：YYYYMMDD），默认为最新交易日
   * @param options.endDate 结束日期（格式：YYYYMMDD），默认与 startDate 相同
   * @param options.limit 返回条数限制
   * @returns 融资融券明细数据数组
   *
   * @example
   * ```ts
   * // 获取当日融资融券数据
   * const today = await tushare.getMarginDetail({ tsCode: '600519.SH' });
   *
   * // 获取指定日期融资融券数据
   * const singleDay = await tushare.getMarginDetail({
   *   tsCode: '600519.SH',
   *   startDate: '20260220',
   *   endDate: '20260220',
   * });
   *
   * // 获取日期范围融资融券数据
   * const range = await tushare.getMarginDetail({
   *   tsCode: '600519.SH',
   *   startDate: '20260201',
   *   endDate: '20260220',
   * });
   *
   * // 获取最近10天融资融券数据
   * const recent10 = await tushare.getMarginDetail({
   *   tsCode: '600519.SH',
   *   limit: 10,
   * });
   * ```
   */
  async getMarginDetail(options: MarginDetailOptions): Promise<MarginDetailData[]> {
    const tsCode = StockCodeValidator.toTushareCode(options.tsCode);
    const startDate = options.startDate || this.getLatestTradeDate();
    const endDate = options.endDate || startDate;

    // 验证日期格式
    if (!this.isValidTradeDate(startDate)) {
      throw new Error(`Invalid start date: ${startDate}. Must be a valid trading date in YYYYMMDD format.`);
    }
    if (endDate && !this.isValidTradeDate(endDate)) {
      throw new Error(`Invalid end date: ${endDate}. Must be a valid trading date in YYYYMMDD format.`);
    }

    // fetchWithRetry 会在全部重试失败后抛出原始错误
    // 不需要检查 null，直接使用返回值
    const data = await this.fetchWithRetry(async () => {
      if (!this.token) {
        throw new Error('Tushare API token is not configured');
      }

      // 构建请求参数
      const params: Record<string, string> = {
        ts_code: tsCode,
        start_date: startDate,
      };

      if (endDate) {
        params.end_date = endDate;
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'margin_detail',
          token: this.token,
          params,
          fields: [
            'ts_code',
            'trade_date',
            // 融资相关
            'rz_ratio',   // 融资余额(万元)
            'rz_che',     // 融资买入额(万元)
            'rz_ch',      // 融资偿还额(万元)
            // 融券相关
            'rq_ratio',   // 融券余额(万元)
            'rq_che',     // 融券卖出量(手)
            'rq_ch',      // 融券偿还量(手)
            // 比率指标
            'rz_rq_ratio', // 融资融券余额比
          ].join(','),
        })
      });

      const result: TushareResponse = await response.json();

      if (result.code !== 0) {
        // 保留原始错误信息，便于调试和问题追踪
        const originalError = result.msg || 'Unknown error';
        throw new Error(`Tushare API error (code: ${result.code}): ${originalError}`);
      }

      const records = transformTushareData<MarginDetailData>(result);
      if (records.length === 0) {
        throw new Error('No margin detail data available');
      }

      return records;
    });

    // 应用 limit 限制
    // limit > 0: 返回前 N 条记录
    // limit <= 0 或 undefined: 返回所有记录（无限制）
    const limit = options.limit;
    if (limit && limit > 0 && data.length > limit) {
      return data.slice(0, limit);
    }

    return data;
  }

  /**
   * 获取财经新闻数据
   * 接口：news
   *
   * 获取市场财经新闻，支持来源筛选和日期范围查询
   *
   * @param options 查询选项
   * @param options.source 新闻来源（如 '财新'、'华尔街见闻' 等）
   * @param options.startDate 开始日期（格式：YYYYMMDD）
   * @param options.endDate 结束日期（格式：YYYYMMDD）
   * @param options.limit 返回条数限制，默认 50 条
   * @returns 财经新闻数据数组
   *
   * @example
   * ```ts
   * // 获取最新财经新闻
   * const news = await tushare.getNews();
   *
   * // 获取指定日期的新闻
   * const news = await tushare.getNews({ startDate: '20260220', endDate: '20260220' });
   *
   * // 获取财新来源的新闻
   * const news = await tushare.getNews({ source: '财新', limit: 20 });
   * ```
   */
  async getNews(options?: NewsOptions): Promise<NewsData[]> {
    // 构建请求参数
    const params: Record<string, string | number> = {};

    if (options?.source) {
      params.source = options.source;
    }
    if (options?.startDate) {
      params.start_date = options.startDate;
    }
    if (options?.endDate) {
      params.end_date = options.endDate;
    }

    // 默认限制 50 条
    const limit = options?.limit || 50;

    // fetchWithRetry 会在全部重试失败后抛出原始错误
    // 不需要检查 null，直接使用返回值
    const data = await this.fetchWithRetry(async () => {
      if (!this.token) {
        throw new Error('Tushare API token is not configured');
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'news',
          token: this.token,
          params,
          fields: 'id,title,content,source,pub_time,url'
        })
      });

      const result: TushareResponse = await response.json();

      if (result.code !== 0) {
        // 保留原始错误信息，便于调试和问题追踪
        const originalError = result.msg || 'Unknown error';
        throw new Error(`Tushare API error (code: ${result.code}): ${originalError}`);
      }

      return transformTushareData<NewsData>(result);
    });

    // 应用 limit 限制
    if (data.length > limit) {
      return data.slice(0, limit);
    }

    return data;
  }

  /**
   * 获取热点新闻话题
   * 接口：news_hot
   *
   * 获取市场热点新闻话题排行
   *
   * @param limit 返回条数限制，默认 20 条
   * @returns 热点新闻话题数组
   *
   * @example
   * ```ts
   * // 获取热点新闻
   * const hotNews = await tushare.getHotNews();
   * ```
   */
  async getHotNews(limit: number = 20): Promise<{ id: string; title: string; hot: number; url: string }[]> {
    // fetchWithRetry 会在全部重试失败后抛出原始错误
    const data = await this.fetchWithRetry(async () => {
      if (!this.token) {
        throw new Error('Tushare API token is not configured');
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'news_hot',
          token: this.token,
          params: {},
          fields: 'id,title,hot,url'
        })
      });

      const result: TushareResponse = await response.json();

      if (result.code !== 0) {
        const originalError = result.msg || 'Unknown error';
        throw new Error(`Tushare API error (code: ${result.code}): ${originalError}`);
      }

      return transformTushareData<{ id: string; title: string; hot: number; url: string }>(result);
    });

    // 应用 limit 限制
    if (data.length > limit) {
      return data.slice(0, limit);
    }

    return data;
  }

  /**
   * 获取股票所属行业
   *
   * 使用 Tushare stock_industry 接口获取股票所属板块信息
   *
   * @param symbol - 股票代码 (如 600519.SH)
   * @returns 股票所属行业信息
   *
   * @example
   * ```ts
   * const tushare = new TushareSource();
   * const industry = await tushare.getStockIndustry('600519.SH');
   * console.log(industry.industry); // '白酒'
   * ```
   */
  async getStockIndustry(symbol: string): Promise<StockIndustry | null> {
    const tsCode = StockCodeValidator.toTushareCode(symbol);

    try {
      const data = await this.fetchWithRetry(async () => {
        if (!this.token) {
          throw new Error('Tushare API token is not configured');
        }

        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_name: 'stock_industry',
            token: this.token,
            params: {
              ts_code: tsCode,
            },
            fields: 'ts_code,name,industry,industry_second,industry_third'
          })
        });

        const result: TushareResponse = await response.json();

        if (result.code !== 0) {
          const originalError = result.msg || 'Unknown error';
          throw new Error(`Tushare API error (code: ${result.code}): ${originalError}`);
        }

        return transformTushareData<any>(result);
      });

      if (!data || data.length === 0) {
        return null;
      }

      const item = data[0];
      return {
        tsCode: item.ts_code || tsCode,
        name: item.name || '',
        industry: item.industry || '',
        industrySecond: item.industry_second || '',
        industryThird: item.industry_third || '',
      };
    } catch (error) {
      console.error(`Failed to get stock industry for ${symbol}:`, error);
      return null;
    }
  }
}
