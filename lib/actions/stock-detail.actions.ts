'use server';

/**
 * 股票详情页数据获取 Server Actions
 *
 * 聚合龙虎榜、资金流向、融资融券等数据
 * @module lib/actions/stock-detail.actions
 */

import { dataAggregator } from '@/lib/data-sources/aggregator';
import { TushareSource, type StockIndustry } from '@/lib/data-sources/sources/tushare';
import { dataCache } from '@/lib/data-sources/cache';
import { AStockCodeUtil } from '@/lib/data-sources/astock';

/**
 * 股票基本信息
 */
export interface StockBasicInfo {
  symbol: string;
  name?: string;
  exchange: 'SH' | 'SZ' | 'BJ';
  marketType?: string;
  isAStock: boolean;
  /** 所属行业（申万一级行业） */
  industry?: string;
  /** 申万二级行业 */
  industrySecond?: string;
  /** 申万三级行业 */
  industryThird?: string;
}

/**
 * 股票实时报价
 */
export interface StockQuote {
  price?: number;
  prevClose?: number;
  change?: number;
  changePercent?: number;
  high?: number;
  low?: number;
  volume?: number;
  amount?: number;
  timestamp?: number;
}

/**
 * 原始报价数据接口
 * 对应数据源返回的原始字段格式 (c=current, pc=prevClose, etc.)
 */
export interface QuoteData {
  /** 当前价格 */
  c?: number;
  /** 前收盘价 */
  pc?: number;
  /** 涨跌额 */
  d?: number;
  /** 涨跌幅百分比 */
  dp?: number;
  /** 最高价 */
  h?: number;
  /** 最低价 */
  l?: number;
  /** 成交量 */
  v?: number;
  /** 成交额 */
  a?: number;
  /** 时间戳 */
  t?: number;
}

/**
 * 类型守卫：检查数据是否为有效的 QuoteData
 */
function isQuoteData(data: unknown): data is QuoteData {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const obj = data as Record<string, unknown>;
  // 至少有一个有效数值字段
  return (
    typeof obj.c === 'number' ||
    typeof obj.pc === 'number' ||
    typeof obj.d === 'number' ||
    typeof obj.dp === 'number'
  );
}

/**
 * 股票详情数据响应
 */
export interface StockDetailResult {
  success: boolean;
  basic?: StockBasicInfo;
  quote?: StockQuote;
  /** 警告信息数组，部分数据可用时会返回警告 */
  warnings?: string[];
  error?: string;
}

/**
 * 获取股票详情数据
 *
 * @param symbol - 股票代码 (如 600519, 600519.SH)
 * @returns 股票详情数据响应
 *
 * @example
 * ```ts
 * const result = await getStockDetail('600519.SH');
 * if (result.success) {
 *   console.log(result.quote?.price);
 * }
 * ```
 */
export async function getStockDetail(symbol: string): Promise<StockDetailResult> {
  try {
    // 标准化股票代码
    const normalizedSymbol = AStockCodeUtil.normalize(symbol);

    // 检查是否为 A 股
    const isAStock = AStockCodeUtil.isAStock(normalizedSymbol);

    // 基础信息
    const exchange = AStockCodeUtil.getExchange(normalizedSymbol);
    const basic: StockBasicInfo = {
      symbol: normalizedSymbol,
      name: normalizedSymbol,
      exchange: exchange === 'SH' ? 'SH' : exchange === 'SZ' ? 'SZ' : 'BJ',
      marketType: AStockCodeUtil.getMarketType(normalizedSymbol),
      isAStock,
    };

    // 如果不是 A 股，只返回基本信息
    if (!isAStock) {
      return {
        success: true,
        basic,
      };
    }

    // 获取实时报价
    const warnings: string[] = [];
    let quote: StockQuote | undefined;
    try {
      const quoteData = await dataAggregator.getQuote(normalizedSymbol);
      if (quoteData && isQuoteData(quoteData)) {
        quote = {
          price: quoteData.c,
          prevClose: quoteData.pc,
          change: quoteData.d,
          changePercent: quoteData.dp,
          high: quoteData.h,
          low: quoteData.l,
          volume: quoteData.v,
          amount: quoteData.a,
          timestamp: quoteData.t,
        };
      } else if (quoteData) {
        warnings.push('Quote data format unexpected, some fields may be missing');
      }
    } catch (error) {
      console.error('Failed to fetch quote:', error);
      warnings.push('Failed to fetch real-time quote');
    }

    // 获取股票所属行业板块信息
    try {
      const tushare = new TushareSource();
      const industryInfo = await tushare.getStockIndustry(normalizedSymbol);
      if (industryInfo) {
        basic.industry = industryInfo.industry;
        basic.industrySecond = industryInfo.industrySecond;
        basic.industryThird = industryInfo.industryThird;
        // 如果没有公司名称，使用返回的名称
        if (!basic.name || basic.name === normalizedSymbol) {
          basic.name = industryInfo.name;
        }
      }
    } catch (error) {
      console.error('Failed to fetch industry info:', error);
      warnings.push('Failed to fetch industry information');
    }

    return {
      success: true,
      basic,
      quote,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error('Failed to fetch stock detail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * 缓存股票详情数据
 */
export async function getCachedStockDetail(symbol: string): Promise<StockDetailResult> {
  const cacheKey = `stock:detail:${symbol}`;
  const cacheTTL = 60; // 60秒缓存

  try {
    // 尝试从缓存获取
    const cached = await dataCache.get(cacheKey) as StockDetailResult | null;
    if (cached) {
      return { ...cached, success: true };
    }
  } catch (error) {
    console.error('Cache get error:', error);
  }

  // 获取新数据
  const result = await getStockDetail(symbol);

  // 缓存成功获取的数据
  if (result.success) {
    try {
      await dataCache.set(cacheKey, result, cacheTTL);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  return result;
}
