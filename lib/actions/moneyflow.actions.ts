'use server';

import { TushareSource } from '@/lib/data-sources/sources/tushare';
import { MoneyFlowMonitor } from '@/lib/data-sources/astock/money-flow-monitor';
import { dataCache } from '@/lib/data-sources/cache';
import type { MoneyFlowData, MoneyFlowTrendAnalysis } from '@/lib/data-sources/astock/money-flow-monitor';

/**
 * 资金流向数据响应类型
 */
export type MoneyFlowResult = {
  success: boolean;
  data?: MoneyFlowData;
  error?: string;
  cached?: boolean; // 标识是否为缓存数据
};

/**
 * 资金流向趋势数据响应类型
 */
export type MoneyFlowTrendResult = {
  success: boolean;
  data?: MoneyFlowTrendAnalysis;
  error?: string;
};

/**
 * 获取最新交易日（Tushare 格式：YYYYMMDD）
 */
function getLatestTradeDate(): string {
  const today = new Date();
  const date = today;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 获取个股资金流向数据
 *
 * @param symbol - 股票代码（如 600519.SH 或 600519）
 * @param date - 可选，交易日期（YYYY-MM-DD 格式），默认为最新交易日
 * @returns 资金流向数据响应（包含成功标志、数据和错误信息）
 *
 * @example
 * ```ts
 * const result = await getMoneyFlowData('600519.SH');
 * if (result.success && result.data) {
 *   console.log(result.data.netMainInflow); // 主力净流入(万元)
 * }
 * ```
 */
export async function getMoneyFlowData(
  symbol: string,
  date?: string
): Promise<MoneyFlowResult> {
  const cacheKey = `moneyflow:${symbol}:${date || 'latest'}`;

  try {
    // 创建 Tushare 数据源实例（token 从环境变量自动读取）
    const tushare = new TushareSource();
    const monitor = new MoneyFlowMonitor(tushare);

    // 获取资金流向数据
    const data = await monitor.getStockMoneyFlow(symbol, date);

    // 缓存成功获取的数据
    await dataCache.set(cacheKey, data, 60);

    return {
      success: true,
      data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // 检查是否为非交易时段错误
    if (errorMessage.includes('Market is closed') ||
        errorMessage.includes('非交易时段') ||
        errorMessage.includes('市场关闭') ||
        errorMessage.includes('不在交易时间')) {
      // 尝试返回缓存数据
      try {
        const cached = await dataCache.get(cacheKey) as MoneyFlowData | null;
        if (cached) {
          return {
            success: true,
            data: cached,
            cached: true, // 标识为缓存数据
          };
        }
      } catch (cacheError) {
        console.error('Failed to retrieve cached data:', cacheError);
      }

      // 无缓存数据可用
      return {
        success: false,
        error: '当前非交易时段，且无缓存数据可用',
      };
    }

    console.error('Failed to fetch money flow data:', error);
    return {
      success: false,
      data: undefined,
      error: errorMessage,
    };
  }
}

/**
 * 获取资金流向趋势数据（N日）
 *
 * @param symbol - 股票代码（如 600519.SH 或 600519）
 * @param days - 交易天数，默认 5
 * @returns 资金流向趋势数据响应（包含成功标志、数据和错误信息）
 *
 * @example
 * ```ts
 * const result = await getMoneyFlowTrend('600519.SH', 5);
 * if (result.success && result.data) {
 *   console.log(result.data.trend); // 'bullish' | 'bearish' | 'neutral'
 *   console.log(result.data.avgMainInflow); // 平均主力净流入
 * }
 * ```
 */
export async function getMoneyFlowTrend(
  symbol: string,
  days: number = 5
): Promise<MoneyFlowTrendResult> {
  try {
    // 创建 Tushare 数据源实例（token 从环境变量自动读取）
    const tushare = new TushareSource();
    const monitor = new MoneyFlowMonitor(tushare);

    // 获取资金流向趋势
    const data = await monitor.getMoneyFlowTrend(symbol, days);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Failed to fetch money flow trend:', error);
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * 获取大单交易数据
 *
 * 注意：此方法返回的是模拟数据，非真实大单成交记录！
 * Tushare 不提供实时逐笔成交数据，基于历史资金流向数据模拟生成。
 *
 * @param symbol - 股票代码（如 600519.SH 或 600519）
 * @returns 大单交易数据响应（包含成功标志、数据和错误信息）
 */
export async function getLargeOrders(
  symbol: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    // 创建 Tushare 数据源实例（token 从环境变量自动读取）
    const tushare = new TushareSource();
    const monitor = new MoneyFlowMonitor(tushare);

    // 获取大单交易数据（模拟数据）
    const data = await monitor.monitorLargeOrders(symbol);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Failed to fetch large orders:', error);
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
