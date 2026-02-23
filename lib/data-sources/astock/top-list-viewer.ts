/**
 * A 股龙虎榜查看器
 *
 * 提供龙虎榜数据查询和分析功能
 * @module data-sources/astock/top-list-viewer
 */

import { TushareSource, type TopListData } from '../../sources/tushare';
import { TradingCalendar } from './trading-calendar';
import { TradingAwareScheduler } from './trading-aware-scheduler';

/**
 * 龙虎榜列表项
 *
 * 用于前端展示的标准化龙虎榜数据
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
  /** 排名（按净买入金额排序） */
  rank: number;
}


/**
 * A 股龙虎榜查看器
 *
 * 提供以下功能：
 * - 获取当日龙虎榜
 * - 获取历史龙虎榜（最近N个交易日）
 * - 获取单只股票的龙虎榜历史
 *
 * @example
 * ```ts
 * import { TushareSource } from '@/lib/data-sources';
 * import { TopListViewer } from '@/lib/data-sources/astock';
 *
 * const tushare = new TushareSource();
 * const viewer = new TopListViewer(tushare);
 *
 * // 获取当日龙虎榜
 * const today = await viewer.getTodayTopList();
 *
 * // 获取最近 5 个交易日龙虎榜
 * const historical = await viewer.getHistoricalTopList(5);
 *
 * // 获取单只股票的龙虎榜历史
 * const stockHistory = await viewer.getStockTopListHistory('600519.SH', 10);
 * ```
 */
export class TopListViewer {
  /**
   * 构造函数
   *
   * @param tushare - Tushare 数据源实例
   */
  constructor(private readonly tushare: TushareSource) {}

  /**
   * 获取当日龙虎榜
   *
   * 返回当日龙虎榜数据，按净买入金额降序排序
   *
   * @returns 龙虎榜列表项数组
   *
   * @example
   * ```ts
   * const viewer = new TopListViewer(tushare);
   *
   * // 获取当日龙虎榜（默认按净买入降序）
   * const today = await viewer.getTodayTopList();
   * ```
   */
  async getTodayTopList(): Promise<TopListItem[]> {
    // 使用 TradingAwareScheduler 检查是否应该发起请求
    if (!TradingAwareScheduler.shouldRequest()) {
      // 在非交易时段，可以返回缓存数据或空数组
      return [];
    }

    // 获取当日龙虎榜数据
    const data = await this.tushare.getTopList();

    // 转换为标准格式并排序
    return this.transformAndFormat(data);
  }

  /**
   * 获取历史龙虎榜（最近N个交易日）
   *
   * 从当前日期开始，向前查找最近 N 个交易日的龙虎榜数据
   *
   * @param days - 交易天数
   * @returns 龙虎榜列表项数组
   *
   * @example
   * ```ts
   * const viewer = new TopListViewer(tushare);
   *
   * // 获取最近 5 个交易日龙虎榜
   * const last5Days = await viewer.getHistoricalTopList(5);
   * ```
   */
  async getHistoricalTopList(days: number): Promise<TopListItem[]> {
    if (days <= 0) {
      throw new Error('days must be greater than 0');
    }

    const allData: TopListData[] = [];
    let currentDate = new Date();
    let collectedDays = 0;

    // 向前查找交易日
    while (collectedDays < days) {
      // 检查是否为交易日
      if (!TradingCalendar.isTradingDay(currentDate)) {
        // 前移一天
        currentDate.setDate(currentDate.getDate() - 1);
        continue;
      }

      // 使用 TradingAwareScheduler 智能延迟
      if (collectedDays > 0) {
        await TradingAwareScheduler.smartDelay(currentDate);
      }

      // 格式化日期为 Tushare 格式 (YYYYMMDD)
      const tradeDate = this.formatTradeDate(currentDate);

      try {
        // 获取该日龙虎榜数据
        const dailyData = await this.tushare.getTopList({ tradeDate });
        allData.push(...dailyData);
        collectedDays++;
      } catch (error) {
        // 如果某日无数据，跳过该日
        // 可能是无龙虎榜数据或 API 错误
      }

      // 前移一天
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // 转换为标准格式并排序
    return this.transformAndFormat(allData);
  }

  /**
   * 获取单只股票的龙虎榜历史
   *
   * 查询指定股票在最近 N 个交易日内的龙虎榜记录
   *
   * @param symbol - 股票代码（如 600519.SH 或 600519）
   * @param days - 查询天数
   * @returns 龙虎榜列表项数组
   *
   * @example
   * ```ts
   * const viewer = new TopListViewer(tushare);
   *
   * // 获取贵州茅台最近 10 次上榜记录
   * const moutaiHistory = await viewer.getStockTopListHistory('600519.SH', 10);
   * ```
   */
  async getStockTopListHistory(
    symbol: string,
    days: number
  ): Promise<TopListItem[]> {
    if (days <= 0) {
      throw new Error('days must be greater than 0');
    }

    const allData: TopListData[] = [];
    let currentDate = new Date();
    let collectedDays = 0;

    // 向前查找交易日
    while (collectedDays < days) {
      // 检查是否为交易日
      if (!TradingCalendar.isTradingDay(currentDate)) {
        // 前移一天
        currentDate.setDate(currentDate.getDate() - 1);
        continue;
      }

      // 使用 TradingAwareScheduler 智能延迟
      if (collectedDays > 0) {
        await TradingAwareScheduler.smartDelay(currentDate);
      }

      // 格式化日期为 Tushare 格式 (YYYYMMDD)
      const tradeDate = this.formatTradeDate(currentDate);

      try {
        // 获取该日该股票的龙虎榜数据
        const dailyData = await this.tushare.getTopList({
          tsCode: symbol,
          tradeDate,
        });

        if (dailyData.length > 0) {
          allData.push(...dailyData);
          collectedDays++;
        }
      } catch (error) {
        // 如果某日无数据，跳过该日
      }

      // 前移一天
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // 转换为标准格式并排序
    return this.transformAndFormat(allData);
  }

  /**
   * 转换数据格式并排序
   *
   * 按净买入金额降序排序
   *
   * @param data - 原始龙虎榜数据
   * @returns 排序后的龙虎榜列表项
   * @private
   */
  private transformAndFormat(data: TopListData[]): TopListItem[] {
    // 转换为标准格式
    const items: TopListItem[] = data.map((item) => ({
      tsCode: item.ts_code,
      name: item.name,
      reason: item.reason,
      buyAmount: item.buy_amount || 0,
      sellAmount: item.sell_amount || 0,
      netAmount: item.net_amount || 0,
      rank: 0, // 稍后计算
    }));

    // 按净买入金额降序排序
    items.sort((a, b) => b.netAmount - a.netAmount);

    // 计算排名
    items.forEach((item, index) => {
      item.rank = index + 1;
    });

    return items;
  }

  /**
   * 格式化交易日期为 Tushare 格式 (YYYYMMDD)
   *
   * @param date - 日期对象
   * @returns Tushare 格式的日期字符串
   * @private
   */
  private formatTradeDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}
