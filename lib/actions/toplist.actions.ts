'use server';

import { TushareSource } from '@/lib/data-sources';

const TUSHARE_API_TOKEN = process.env.TUSHARE_API_TOKEN || '';

/**
 * 龙虎榜列表项（用于前端展示）
 */
export interface TopListItem {
  /** 股票代码 */
  tsCode: string;
  /** 股票名称 */
  name: string;
  /** 上榜理由 */
  reason: string;
  /** 买入金额(万元) */
  buyAmount: number;
  /** 卖出金额(万元) */
  sellAmount: number;
  /** 净买入(万元) */
  netAmount: number;
  /** 交易日期 YYYY-MM-DD */
  tradeDate: string;
}

/**
 * 获取龙虎榜数据
 *
 * @param symbol - 可选，股票代码（不传则获取大盘龙虎榜）
 * @param limit - 显示条数，默认 10
 * @returns 龙虎榜列表项数组
 */
export async function getTopListData(
  symbol?: string,
  limit: number = 10
): Promise<TopListItem[]> {
  try {
    if (!TUSHARE_API_TOKEN) {
      console.error('TUSHARE_API_TOKEN is not configured');
      return [];
    }

    // 创建 Tushare 数据源实例
    const tushare = new TushareSource(TUSHARE_API_TOKEN);

    // 获取龙虎榜数据
    const data = await tushare.getTopList({
      tsCode: symbol,
      limit,
    });

    // 转换为前端格式
    const today = new Date().toISOString().split('T')[0];
    return data.map((item) => ({
      tsCode: item.ts_code,
      name: item.name,
      reason: item.reason,
      buyAmount: item.buy_amount || 0,
      sellAmount: item.sell_amount || 0,
      netAmount: item.net_amount || 0,
      tradeDate: today,
    }));
  } catch (error) {
    console.error('Failed to fetch top list data:', error);
    return [];
  }
}

/**
 * 获取历史龙虎榜数据
 *
 * @param days - 查询天数
 * @param limit - 每日显示条数
 * @returns 龙虎榜列表项数组
 */
export async function getHistoricalTopListData(
  days: number = 5,
  limit: number = 10
): Promise<TopListItem[]> {
  try {
    if (!TUSHARE_API_TOKEN) {
      console.error('TUSHARE_API_TOKEN is not configured');
      return [];
    }

    // 创建 Tushare 数据源实例
    const tushare = new TushareSource(TUSHARE_API_TOKEN);

    // 获取历史龙虎榜数据
    const allData: TopListItem[] = [];
    const currentDate = new Date();
    let collectedDays = 0;
    const maxIterations = days * 10;
    let iterations = 0;

    while (collectedDays < days && iterations < maxIterations) {
      iterations++;

      // 格式化日期为 Tushare 格式 (YYYYMMDD)
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const tradeDate = `${year}${month}${day}`;
      const displayDate = `${year}-${month}-${day}`;

      try {
        const data = await tushare.getTopList({ tradeDate, limit });

        if (data.length > 0) {
          allData.push(
            ...data.map((item) => ({
              tsCode: item.ts_code,
              name: item.name,
              reason: item.reason,
              buyAmount: item.buy_amount || 0,
              sellAmount: item.sell_amount || 0,
              netAmount: item.net_amount || 0,
              tradeDate: displayDate,
            }))
          );
          collectedDays++;
        }
      } catch (error) {
        console.warn(`Failed to fetch top list for ${tradeDate}:`, error);
      }

      // 前移一天
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return allData;
  } catch (error) {
    console.error('Failed to fetch historical top list data:', error);
    return [];
  }
}
