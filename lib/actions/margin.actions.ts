'use server';

import { TushareSource } from '@/lib/data-sources/sources/tushare';
import { MarginTrading } from '@/lib/data-sources/astock/margin-trading';
import { dataCache } from '@/lib/data-sources/cache';
import type { MarginData, SentimentAnalysisResult } from '@/lib/data-sources/astock/margin-trading';

/**
 * 融资融券数据响应类型
 */
export type MarginResult = {
  success: boolean;
  data?: MarginData;
  error?: string;
  cached?: boolean; // 标识是否为缓存数据
};

/**
 * 融资融券趋势数据响应类型
 */
export type MarginTrendResult = {
  success: boolean;
  data?: MarginData[];
  trend?: {
    marginBalanceChange: number;
    marginBalanceChangeRate: number;
    shortBalanceChange: number;
    shortBalanceChangeRate: number;
    marginRatioChange: number;
    sentiment: 'bullish' | 'bearish' | 'neutral';
  };
  error?: string;
};

/**
 * 获取个股融资融券数据
 *
 * @param symbol - 股票代码（如 600519.SH 或 600519）
 * @param date - 可选，交易日期（YYYY-MM-DD 格式），默认为最新交易日
 * @returns 融资融券数据响应（包含成功标志、数据和错误信息）
 *
 * @example
 * ```ts
 * const result = await getMarginData('600519.SH');
 * if (result.success && result.data) {
 *   console.log(result.data.marginBalance); // 融资余额(万元)
 * }
 * ```
 */
export async function getMarginData(
  symbol: string,
  date?: string
): Promise<MarginResult> {
  const cacheKey = `margin:${symbol}:${date || 'latest'}`;

  try {
    // 创建 Tushare 数据源实例（token 从环境变量自动读取）
    const tushare = new TushareSource();
    const margin = new MarginTrading(tushare);

    // 获取融资融券数据
    const result = await margin.getMarginData(symbol, date);

    // 缓存成功获取的数据
    if (result.success && result.data) {
      await dataCache.set(cacheKey, result.data, 60);
      return {
        success: true,
        data: result.data,
      };
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // 检查是否为非交易时段错误
    if (errorMessage.includes('Market is closed') ||
        errorMessage.includes('非交易时段') ||
        errorMessage.includes('市场关闭') ||
        errorMessage.includes('不在交易时间')) {
      // 尝试返回缓存数据
      try {
        const cached = await dataCache.get(cacheKey) as MarginData | null;
        if (cached) {
          return {
            success: true,
            data: cached,
            cached: true, // 标识为缓存数据
          };
        }
      } catch (cacheError) {
        console.error('Failed to retrieve cached margin data:', cacheError);
      }

      // 无缓存数据可用
      return {
        success: false,
        error: '当前非交易时段，且无缓存数据可用',
      };
    }

    console.error('Failed to fetch margin data:', error);
    return {
      success: false,
      data: undefined,
      error: errorMessage,
    };
  }
}

/**
 * 获取融资融券趋势数据（N日）
 *
 * @param symbol - 股票代码（如 600519.SH 或 600519）
 * @param days - 交易天数，默认 5
 * @returns 融资融券趋势数据响应（包含成功标志、数据和错误信息）
 *
 * @example
 * ```ts
 * const result = await getMarginTrend('600519.SH', 5);
 * if (result.success && result.trend) {
 *   console.log(result.trend.sentiment); // 'bullish' | 'bearish' | 'neutral'
 *   console.log(result.trend.marginBalanceChange); // 融资余额变化
 * }
 * ```
 */
export async function getMarginTrend(
  symbol: string,
  days: number = 5
): Promise<MarginTrendResult> {
  try {
    // 创建 Tushare 数据源实例（token 从环境变量自动读取）
    const tushare = new TushareSource();
    const margin = new MarginTrading(tushare);

    // 获取融资融券趋势
    const result = await margin.getMarginTrend(symbol, days);

    return result;
  } catch (error) {
    console.error('Failed to fetch margin trend:', error);
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * 分析多空情绪
 *
 * @param symbol - 股票代码（如 600519.SH 或 600519）
 * @param days - 分析天数，默认 5
 * @returns 多空情绪分析结果
 *
 * @example
 * ```ts
 * const result = await analyzeSentiment('600519.SH', 5);
 * if (result.success && result.data) {
 *   console.log(result.data.sentiment); // 'bullish' | 'bearish' | 'neutral'
 *   console.log(result.data.confidence); // 0-100
 *   console.log(result.data.reasons); // 分析原因列表
 * }
 * ```
 */
export async function analyzeSentiment(
  symbol: string,
  days: number = 5
): Promise<SentimentAnalysisResult> {
  try {
    // 创建 Tushare 数据源实例（token 从环境变量自动读取）
    const tushare = new TushareSource();
    const margin = new MarginTrading(tushare);

    // 分析多空情绪
    const result = await margin.analyzeSentiment(symbol, days);

    return result;
  } catch (error) {
    console.error('Failed to analyze sentiment:', error);
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
