'use server';

import { TushareSource } from '@/lib/data-sources/sources/tushare';
import { TradingCalendar } from '@/lib/data-sources/astock';

/**
 * 龙虎榜数据响应类型
 */
export type TopListDataResult = {
  success: boolean;
  data: TopListItem[];
  error?: string;
};

/**
 * 获取最新交易日期（Tushare 格式：YYYYMMDD）
 */
function getLatestTradeDate(): string {
  const today = new Date();
  const date = TradingCalendar.isTradingDay(today)
    ? today
    : getPreviousTradingDay(today);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 获取前一个交易日
 */
function getPreviousTradingDay(date: Date): Date {
  const prevDay = new Date(date);
  for (let i = 0; i < 7; i++) {
    prevDay.setDate(prevDay.getDate() - 1);
    if (TradingCalendar.isTradingDay(prevDay)) {
      return prevDay;
    }
  }
  return prevDay;
}

/**
 * 将 Tushare 日期格式 (YYYYMMDD) 转换为显示格式 (YYYY-MM-DD)
 */
function formatDateFromTushare(tushareDate: string): string {
  if (tushareDate.length !== 8) {
    return tushareDate;
  }
  const year = tushareDate.substring(0, 4);
  const month = tushareDate.substring(4, 6);
  const day = tushareDate.substring(6, 8);
  return `${year}-${month}-${day}`;
}

/**
 * 获取龙虎榜数据
 *
 * @param symbol - 可选，股票代码（不传则获取大盘龙虎榜）
 * @param limit - 显示条数，默认 10
 * @returns 龙虎榜数据响应（包含成功标志、数据和错误信息）
 */
export async function getTopListData(
  symbol?: string,
  limit: number = 10
): Promise<TopListDataResult> {
  try {
    // 创建 Tushare 数据源实例（token 从环境变量自动读取）
    const tushare = new TushareSource();

    // 获取最新交易日用于显示
    const latestTradeDate = getLatestTradeDate();
    const displayDate = formatDateFromTushare(latestTradeDate);

    // 获取龙虎榜数据（使用最新交易日）
    const data = await tushare.getTopList({
      tsCode: symbol,
      limit,
    });

    // 转换为前端格式，使用实际的交易日期
    const items: TopListItem[] = data.map((item) => ({
      tsCode: item.ts_code,
      name: item.name,
      reason: item.reason,
      buyAmount: item.buy_amount || 0,
      sellAmount: item.sell_amount || 0,
      netAmount: item.net_amount || 0,
      rank: 0, // 稍后根据排序计算
      tradeDate: displayDate,
    }));

    // 按净买入金额降序排序
    items.sort((a, b) => b.netAmount - a.netAmount);

    // 计算排名
    items.forEach((item, index) => {
      item.rank = index + 1;
    });

    // 区分"无数据"和"API错误"
    if (items.length === 0) {
      return {
        success: true,
        data: [],
        error: undefined, // 无数据不是错误
      };
    }

    return {
      success: true,
      data: items,
    };
  } catch (error) {
    console.error('Failed to fetch top list data:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * 获取历史龙虎榜数据
 *
 * @param days - 查询天数
 * @param limit - 每日显示条数
 * @returns 龙虎榜数据响应（包含成功标志、数据和错误信息）
 */
export async function getHistoricalTopListData(
  days: number = 5,
  limit: number = 10
): Promise<TopListDataResult> {
  try {
    // 创建 Tushare 数据源实例（token 从环境变量自动读取）
    const tushare = new TushareSource();

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
          // 转换并计算排名
          const dailyItems: TopListItem[] = data.map((item) => ({
            tsCode: item.ts_code,
            name: item.name,
            reason: item.reason,
            buyAmount: item.buy_amount || 0,
            sellAmount: item.sell_amount || 0,
            netAmount: item.net_amount || 0,
            rank: 0,
            tradeDate: displayDate,
          }));

          // 按净买入金额降序排序
          dailyItems.sort((a, b) => b.netAmount - a.netAmount);

          // 计算排名
          dailyItems.forEach((item, index) => {
            item.rank = index + 1;
          });

          allData.push(...dailyItems);
          collectedDays++;
        }
      } catch (error) {
        console.warn(`Failed to fetch top list for ${tradeDate}:`, error);
      }

      // 前移一天
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return {
      success: true,
      data: allData,
    };
  } catch (error) {
    console.error('Failed to fetch historical top list data:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
