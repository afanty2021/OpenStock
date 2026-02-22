/**
 * A 股交易时段感知调度器
 *
 * 根据交易时段智能调度 API 请求，节省 API 配额
 * @module data-sources/astock/trading-aware-scheduler
 */

import { TradingCalendar, TradingStatusCode } from './trading-calendar';

/**
 * 请求间隔配置（毫秒）
 *
 * 根据不同的交易状态返回不同的轮询间隔
 */
const REQUEST_INTERVALS = {
  /** 交易中，高频更新 */
  TRADING: 3000,        // 3秒
  /** 集合竞价，中频更新 */
  PRE_MARKET: 5000,     // 5秒
  /** 午间休市，低频更新 */
  LUNCH_BREAK: 60000,   // 1分钟
  /** 收市后，极低频更新 */
  CLOSED: 300000,       // 5分钟
  /** 节假日，极低频更新 */
  HOLIDAY: 600000,      // 10分钟
} as const;

/**
 * 应暂停请求的交易状态
 *
 * 在这些状态下应暂停 API 请求以节省配额
 */
const PAUSE_REQUEST_STATUSES: Set<TradingStatusCode> = new Set([
  'HOLIDAY',
  'CLOSED',
  'LUNCH_BREAK',
]);

/**
 * A 股交易时段感知调度器
 *
 * 根据交易时段智能调度 API 请求，节省 API 配额。
 * 提供以下功能：
 * - 判断是否应该发起 API 请求
 * - 获取推荐的请求频率
 * - 智能延迟函数
 *
 * @example
 * ```ts
 * import { TradingAwareScheduler } from '@/lib/data-sources/astock';
 *
 * // 判断是否应该发起请求
 * if (TradingAwareScheduler.shouldRequest()) {
 *   const data = await fetchStockData();
 * }
 *
 * // 获取推荐的请求频率
 * const interval = TradingAwareScheduler.getRecommendedInterval();
 * setTimeout(() => { ... }, interval);
 *
 * // 使用智能延迟
 * await TradingAwareScheduler.smartDelay();
 * // 延迟完成后继续执行...
 * ```
 */
export class TradingAwareScheduler {
  /**
   * 判断是否应该发起 API 请求
   *
   * 在以下情况应暂停 API 请求以节省配额：
   * - HOLIDAY - 法定节假日
   * - CLOSED - 非交易时段
   * - LUNCH_BREAK - 午间休市
   *
   * @param date - 要检查的日期时间，默认为当前时间
   * @returns 是否应该发起请求（true=可以请求，false=暂停请求）
   *
   * @example
   * ```ts
   * // 在交易时段应返回 true
   * const tradingDate = new Date('2026-02-24T10:00:00+08:00');
   * console.log(TradingAwareScheduler.shouldRequest(tradingDate)); // true
   *
   * // 在午间休市应返回 false
   * const lunchDate = new Date('2026-02-24T12:00:00+08:00');
   * console.log(TradingAwareScheduler.shouldRequest(lunchDate)); // false
   * ```
   */
  static shouldRequest(date: Date = new Date()): boolean {
    const status = TradingCalendar.getTradingStatus(date, false);
    return !PAUSE_REQUEST_STATUSES.has(status.status);
  }

  /**
   * 获取推荐的请求频率（毫秒）
   *
   * 根据交易状态返回不同的轮询间隔：
   * - TRADING: 3000ms (3秒) - 交易中，高频更新
   * - PRE_MARKET: 5000ms (5秒) - 集合竞价，中频更新
   * - LUNCH_BREAK: 60000ms (1分钟) - 午间休市，低频更新
   * - CLOSED: 300000ms (5分钟) - 收市后，极低频更新
   * - HOLIDAY: 600000ms (10分钟) - 节假日，极低频更新
   *
   * @param date - 要检查的日期时间，默认为当前时间
   * @returns 推荐的请求间隔时间（毫秒）
   *
   * @example
   * ```ts
   * // 在交易时段应返回 3000ms
   * const tradingDate = new Date('2026-02-24T10:00:00+08:00');
   * console.log(TradingAwareScheduler.getRecommendedInterval(tradingDate)); // 3000
   *
   * // 在收市后应返回 300000ms
   * const closedDate = new Date('2026-02-24T18:00:00+08:00');
   * console.log(TradingAwareScheduler.getRecommendedInterval(closedDate)); // 300000
   * ```
   */
  static getRecommendedInterval(date: Date = new Date()): number {
    const status = TradingCalendar.getTradingStatus(date, false);
    return REQUEST_INTERVALS[status.status];
  }

  /**
   * 智能延迟函数
   *
   * 根据交易时段动态调整延迟时间。
   * 使用推荐的请求间隔作为延迟时间。
   *
   * @param date - 要检查的日期时间，默认为当前时间
   * @returns Promise，在指定的延迟时间后解决
   *
   * @example
   * ```ts
   * // 在循环中使用智能延迟
   * while (true) {
   *   if (TradingAwareScheduler.shouldRequest()) {
   *     const data = await fetchData();
   *     processData(data);
   *   }
   *   // 根据交易时段智能延迟
   *   await TradingAwareScheduler.smartDelay();
   * }
   * ```
   */
  static async smartDelay(date: Date = new Date()): Promise<void> {
    const interval = this.getRecommendedInterval(date);
    return new Promise(resolve => setTimeout(resolve, interval));
  }
}
