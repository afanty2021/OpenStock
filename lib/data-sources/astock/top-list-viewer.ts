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
 * 排序选项
 */
export type SortField = 'netAmount' | 'buyAmount' | 'sellAmount';
export type SortOrder = 'asc' | 'desc';

/**
 * 龙虎榜查询选项
 */
export interface TopListOptions {
  /** 排序字段 */
  sortBy?: SortField;
  /** 排序顺序 */
  sortOrder?: SortOrder;
  /** 返回条数限制 */
  limit?: number;
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
   * @param options - 查询选项
   * @returns 龙虎榜列表项数组
   *
   * @example
   * ```ts
   * const viewer = new TopListViewer(tushare);
   *
   * // 获取当日龙虎榜（默认按净买入降序）
   * const today = await viewer.getTodayTopList();
   *
   * // 获取当日龙虎榜 TOP20
   * const top20 = await viewer.getTodayTopList({ limit: 20 });
   *
   * // 按买入金额排序
   * const byBuy = await viewer.getTodayTopList({
   *   sortBy: 'buyAmount',
   *   sortOrder: 'desc'
   * });
   * ```
   */
  async getTodayTopList(options: TopListOptions = {}): Promise<TopListItem[]> {
    // 使用 TradingAwareScheduler 检查是否应该发起请求
    if (!TradingAwareScheduler.shouldRequest()) {
      // 在非交易时段，可以返回缓存数据或空数组
      return [];
    }

    // 获取当日龙虎榜数据
    const data = await this.tushare.getTopList({
      limit: options.limit,
    });

    // 转换为标准格式并排序
    return this.transformAndSort(data, options);
  }

  /**
   * 获取历史龙虎榜（最近N个交易日）
   *
   * 从当前日期开始，向前查找最近 N 个交易日的龙虎榜数据
   *
   * @param days - 交易天数
   * @param options - 查询选项
   * @returns 龙虎榜列表项数组
   *
   * @example
   * ```ts
   * const viewer = new TopListViewer(tushare);
   *
   * // 获取最近 5 个交易日龙虎榜
   * const last5Days = await viewer.getHistoricalTopList(5);
   *
   * // 获取最近 10 个交易日龙虎榜 TOP50
   * const last10DaysTop50 = await viewer.getHistoricalTopList(10, {
   *   limit: 50
   * });
   * ```
   */
  async getHistoricalTopList(days: number, options: TopListOptions = {}): Promise<TopListItem[]> {
    if (days <= 0) {
      throw new Error('days must be greater than 0');
    }

    // 限制最大查询天数（避免过多 API 请求）
    const maxDays = 30;
    const queryDays = Math.min(days, maxDays);

    const allData: TopListData[] = [];
    let currentDate = new Date();
    let collectedDays = 0;

    // 向前查找交易日
    while (collectedDays < queryDays) {
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
    return this.transformAndSort(allData, options);
  }

  /**
   * 获取单只股票的龙虎榜历史
   *
   * 查询指定股票在最近 N 个交易日内的龙虎榜记录
   *
   * @param symbol - 股票代码（如 600519.SH 或 600519）
   * @param days - 查询天数
   * @param options - 查询选项
   * @returns 龙虎榜列表项数组
   *
   * @example
   * ```ts
   * const viewer = new TopListViewer(tushare);
   *
   * // 获取贵州茅台最近 10 次上榜记录
   * const moutaiHistory = await viewer.getStockTopListHistory('600519.SH', 10);
   *
   * // 获取最近 30 天内的上榜记录，按净买入排序
   * const moutaiSorted = await viewer.getStockTopListHistory('600519.SH', 30, {
   *   sortBy: 'netAmount',
   *   sortOrder: 'desc'
   * });
   * ```
   */
  async getStockTopListHistory(
    symbol: string,
    days: number,
    options: TopListOptions = {}
  ): Promise<TopListItem[]> {
    if (days <= 0) {
      throw new Error('days must be greater than 0');
    }

    // 限制最大查询天数
    const maxDays = 365; // 最多查询一年
    const queryDays = Math.min(days, maxDays);

    const allData: TopListData[] = [];
    let currentDate = new Date();
    let collectedDays = 0;

    // 向前查找交易日
    while (collectedDays < queryDays) {
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
    return this.transformAndSort(allData, options);
  }

  /**
   * 转换数据格式并排序
   *
   * @param data - 原始龙虎榜数据
   * @param options - 排序选项
   * @returns 排序后的龙虎榜列表项
   * @private
   */
  private transformAndSort(
    data: TopListData[],
    options: TopListOptions
  ): TopListItem[] {
    // 转换为标准格式
    let items: TopListItem[] = data.map((item, index) => ({
      tsCode: item.ts_code,
      name: item.name,
      reason: item.reason,
      buyAmount: item.buy_amount || 0,
      sellAmount: item.sell_amount || 0,
      netAmount: item.net_amount || 0,
      rank: index + 1,
    }));

    // 排序
    const sortBy = options.sortBy || 'netAmount';
    const sortOrder = options.sortOrder || 'desc';

    items.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // 重新计算排名
    items = items.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    // 应用 limit 限制
    if (options.limit && options.limit > 0) {
      items = items.slice(0, options.limit);
    }

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
