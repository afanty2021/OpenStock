/**
 * A 股资金流向监控器
 *
 * 提供个股资金流向分析和趋势追踪功能
 * @module data-sources/astock/money-flow-monitor
 */

import { TushareSource, type MoneyFlowData as TushareMoneyFlowData } from '../../sources/tushare';
import { TradingCalendar } from './trading-calendar';
import { TradingAwareScheduler } from './trading-aware-scheduler';

/**
 * 资金流向数据
 *
 * 用于前端展示的标准化资金流向数据
 */
export interface MoneyFlowData {
  /** 股票代码 */
  tsCode: string;
  /** 交易日期 YYYY-MM-DD */
  tradeDate: string;
  /** 主力净流入(万元) */
  netMainInflow: number;
  /** 主力净流入占比% */
  mainInflowRate: number;
  /** 大单买入(万股) */
  largeBuy: number;
  /** 大单卖出(万股) */
  largeSell: number;
  /** 大单净买(万股) */
  largeNet: number;
  /** 散户净流入(万元) */
  retailInflow: number;
  /** 超大单净流入(万元) */
  superLargeInflow: number;
  /** 中单净流入(万元) */
  mediumInflow: number;
}

/**
 * 大单交易数据
 *
 * 用于实时监控大单交易
 */
export interface LargeOrder {
  /** 股票代码 */
  tsCode: string;
  /** 时间戳 HH:MM:SS */
  time: string;
  /** 成交量(手) */
  volume: number;
  /** 成交额(万元) */
  amount: number;
  /** 方向 */
  direction: 'buy' | 'sell';
}

/**
 * 资金流向趋势分析
 *
 * 提供资金流向的趋势分析结果
 */
export interface MoneyFlowTrendAnalysis {
  /** 资金流向数据列表 */
  data: MoneyFlowData[];
  /** 平均主力净流入(万元) */
  avgMainInflow: number;
  /** 主力净流入总额(万元) */
  totalMainInflow: number;
  /** 连续净流入天数 */
  consecutiveInflowDays: number;
  /** 连续净流出天数 */
  consecutiveOutflowDays: number;
  /** 趋势方向 */
  trend: 'bullish' | 'bearish' | 'neutral';
}

/**
 * A 股资金流向监控器
 *
 * 提供以下功能：
 * - 获取个股资金流向
 * - 获取资金流向趋势（N日）
 * - 实时监控大单（模拟）
 *
 * @example
 * ```ts
 * import { TushareSource } from '@/lib/data-sources';
 * import { MoneyFlowMonitor } from '@/lib/data-sources/astock';
 *
 * const tushare = new TushareSource();
 * const monitor = new MoneyFlowMonitor(tushare);
 *
 * // 获取个股资金流向
 * const flow = await monitor.getStockMoneyFlow('600519.SH');
 *
 * // 获取资金流向趋势
 * const trend = await monitor.getMoneyFlowTrend('600519.SH', 5);
 *
 * // 监控大单
 * const orders = await monitor.monitorLargeOrders('600519.SH');
 * ```
 */
export class MoneyFlowMonitor {
  /**
   * 大单阈值（万元）
   *
   * 单笔成交金额 >= 20万元 视为大单
   */
  private static readonly LARGE_ORDER_THRESHOLD = 20;

  /**
   * 构造函数
   *
   * @param tushare - Tushare 数据源实例
   */
  constructor(private readonly tushare: TushareSource) {}

  /**
   * 获取个股资金流向
   *
   * 返回指定股票在指定日期的资金流向数据
   *
   * @param symbol - 股票代码（如 600519.SH 或 600519）
   * @param date - 交易日期（YYYY-MM-DD 格式），默认为最新交易日
   * @returns 资金流向数据
   *
   * @example
   * ```ts
   * const monitor = new MoneyFlowMonitor(tushare);
   *
   * // 获取最新交易日资金流向
   * const flow = await monitor.getStockMoneyFlow('600519.SH');
   *
   * // 获取指定日期资金流向
   * const flow = await monitor.getStockMoneyFlow('600519.SH', '2026-02-20');
   * ```
   */
  async getStockMoneyFlow(
    symbol: string,
    date?: string
  ): Promise<MoneyFlowData> {
    // 使用 TradingAwareScheduler 检查是否应该发起请求
    if (!TradingAwareScheduler.shouldRequest()) {
      // 非交易时段抛出错误（实际应该使用缓存数据）
      // TODO: 实现 L1 缓存集成
      throw new Error('Market is closed. Data not available in off-hours.');
    }

    // 确定查询日期
    const queryDate = date
      ? this.parseDisplayDate(date)
      : new Date();

    // 验证是否为交易日
    if (!TradingCalendar.isTradingDay(queryDate)) {
      throw new Error(`${date || queryDate.toISOString()} is not a trading day.`);
    }

    // 格式化日期为 Tushare 格式 (YYYYMMDD)
    const tradeDate = this.formatTradeDate(queryDate);

    // 获取资金流向数据
    const data = await this.tushare.getMoneyFlow({
      tsCode: symbol,
      startDate: tradeDate,
      endDate: tradeDate,
    });

    if (data.length === 0) {
      throw new Error(`No money flow data available for ${symbol} on ${tradeDate}`);
    }

    // 转换为标准格式
    return this.transformMoneyFlowData(data[0], queryDate);
  }

  /**
   * 获取资金流向趋势（N日）
   *
   * 从当前日期开始，向前查找最近 N 个交易日的资金流向数据
   *
   * @param symbol - 股票代码（如 600519.SH 或 600519）
   * @param days - 交易天数
   * @returns 资金流向趋势分析结果
   *
   * @example
   * ```ts
   * const monitor = new MoneyFlowMonitor(tushare);
   *
   * // 获取最近 5 个交易日资金流向趋势
   * const trend = await monitor.getMoneyFlowTrend('600519.SH', 5);
   * console.log(trend.trend); // 'bullish' | 'bearish' | 'neutral'
   * ```
   */
  async getMoneyFlowTrend(
    symbol: string,
    days: number
  ): Promise<MoneyFlowTrendAnalysis> {
    if (days <= 0) {
      throw new Error('days must be greater than 0');
    }

    const allData: MoneyFlowData[] = [];
    let currentDate = new Date();
    let collectedDays = 0;
    const MAX_ITERATIONS = days * 10; // 最多尝试 10 倍的天数
    let iterations = 0;

    // 向前查找交易日
    while (collectedDays < days && iterations < MAX_ITERATIONS) {
      iterations++;

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
        // 获取该日资金流向数据
        const dailyData = await this.tushare.getMoneyFlow({
          tsCode: symbol,
          startDate: tradeDate,
          endDate: tradeDate,
        });

        if (dailyData.length > 0) {
          const transformedData = this.transformMoneyFlowData(
            dailyData[0],
            currentDate
          );
          allData.push(transformedData);
          collectedDays++;
        }
      } catch (error) {
        // 记录错误但继续处理其他日期
        console.warn(
          `Failed to fetch money flow for ${symbol} on ${tradeDate}:`,
          error
        );
      }

      // 前移一天
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // 计算趋势分析
    return this.analyzeTrend(allData);
  }

  /**
   * 实时监控大单（模拟）
   *
   * 由于 Tushare 不提供实时逐笔成交数据，此方法基于历史资金流向数据
   * 模拟生成大单交易记录
   *
   * @param symbol - 股票代码（如 600519.SH 或 600519）
   * @returns 大单交易数组
   *
   * @example
   * ```ts
   * const monitor = new MoneyFlowMonitor(tushare);
   *
   * // 监控大单交易
   * const orders = await monitor.monitorLargeOrders('600519.SH');
   * orders.forEach(order => {
   *   console.log(`${order.time}: ${order.direction} ${order.volume}手`);
   * });
   * ```
   */
  async monitorLargeOrders(symbol: string): Promise<LargeOrder[]> {
    // 使用 TradingAwareScheduler 检查是否应该发起请求
    if (!TradingAwareScheduler.shouldRequest()) {
      return [];
    }

    // 获取当日资金流向数据
    const flowData = await this.getStockMoneyFlow(symbol);

    const orders: LargeOrder[] = [];

    // 基于大单净买入量模拟生成大单记录
    // 注意：这是模拟数据，实际应用中需要实时逐笔成交接口
    const largeNetVolume = Math.abs(flowData.largeNet); // 万股
    const largeNetAmount = Math.abs(flowData.netMainInflow); // 万元

    if (largeNetVolume > 0) {
      // 计算平均每笔大单的成交量
      const avgVolumePerOrder = 100; // 假设平均每笔 100 手
      const orderCount = Math.min(
        Math.floor(largeNetVolume * 10000 / avgVolumePerOrder),
        50 // 最多生成 50 笔记录
      );

      // 生成模拟大单记录
      const now = new Date();
      const baseTime = new Date(now);
      baseTime.setHours(9, 30, 0, 0); // 从开盘时间开始

      for (let i = 0; i < orderCount; i++) {
        // 随机生成时间（交易时段内）
        const minutes = Math.floor(Math.random() * 240); // 9:30-15:00，共 240 分钟
        const orderTime = new Date(baseTime);
        orderTime.setMinutes(orderTime.getMinutes() + minutes);

        // 判断买卖方向
        const isBuy = flowData.largeNet > 0;

        orders.push({
          tsCode: flowData.tsCode,
          time: this.formatOrderTime(orderTime),
          volume: avgVolumePerOrder + Math.floor(Math.random() * 200 - 100), // 随机波动
          amount:
            (avgVolumePerOrder *
              (1 + Math.random() * 0.2 - 0.1) *
              (isBuy ? 1 : -1)) /
            10000, // 转换为万元
          direction: isBuy ? 'buy' : 'sell',
        });
      }
    }

    // 按时间排序
    orders.sort((a, b) => a.time.localeCompare(b.time));

    return orders;
  }

  /**
   * 分析资金流向趋势
   *
   * @param data - 资金流向数据数组
   * @returns 趋势分析结果
   * @private
   */
  private analyzeTrend(data: MoneyFlowData[]): MoneyFlowTrendAnalysis {
    if (data.length === 0) {
      return {
        data: [],
        avgMainInflow: 0,
        totalMainInflow: 0,
        consecutiveInflowDays: 0,
        consecutiveOutflowDays: 0,
        trend: 'neutral',
      };
    }

    // 计算总额和平均值
    const totalMainInflow = data.reduce(
      (sum, item) => sum + item.netMainInflow,
      0
    );
    const avgMainInflow = totalMainInflow / data.length;

    // 计算连续净流入/流出天数
    // data[0] 是最新的数据
    let consecutiveInflowDays = 0;
    let consecutiveOutflowDays = 0;

    // 从最新数据开始计算连续天数
    for (const item of data) {
      if (item.netMainInflow > 0) {
        if (consecutiveOutflowDays > 0) break;
        consecutiveInflowDays++;
      } else if (item.netMainInflow < 0) {
        if (consecutiveInflowDays > 0) break;
        consecutiveOutflowDays++;
      }
    }

    // 判断趋势方向
    let trend: 'bullish' | 'bearish' | 'neutral';
    if (consecutiveInflowDays >= 3 && totalMainInflow > 0) {
      trend = 'bullish';
    } else if (consecutiveOutflowDays >= 3 && totalMainInflow < 0) {
      trend = 'bearish';
    } else {
      trend = 'neutral';
    }

    return {
      data,
      avgMainInflow,
      totalMainInflow,
      consecutiveInflowDays,
      consecutiveOutflowDays,
      trend,
    };
  }

  /**
   * 转换 Tushare 资金流向数据为标准格式
   *
   * @param data - Tushare 原始数据
   * @param date - 交易日期
   * @returns 标准格式资金流向数据
   * @private
   */
  private transformMoneyFlowData(
    data: TushareMoneyFlowData,
    date: Date
  ): MoneyFlowData {
    // 主力净流入 = 超大单净流入 + 大单净流入
    const netMainInflow =
      (data.net_buy_mf_amount || 0) + (data.net_buy_elg_amount || 0);

    // 大单净买量（手）
    const largeNet = data.net_buy_elg_vol || 0;

    // 散户净流入 = 小单净流入（取反，因为小单净买入表示散户流出）
    const retailInflow = -(data.net_buy_lg_amount || 0);

    // 计算主力净流入占比
    // 假设当日成交额为 10000 万元（实际应从 daily 接口获取）
    const estimatedTotalAmount = 10000;
    const mainInflowRate =
      estimatedTotalAmount > 0 ? (netMainInflow / estimatedTotalAmount) * 100 : 0;

    // 使用 Tushare 数据中的日期（如果有的话），否则使用传入的日期
    const tradeDate = data.trade_date
      ? this.parseTushareDate(data.trade_date)
      : date;

    return {
      tsCode: data.ts_code,
      tradeDate: this.formatDisplayDate(tradeDate),
      netMainInflow,
      mainInflowRate,
      largeBuy: 0, // Tushare 不提供单独的买入/卖出量
      largeSell: 0,
      largeNet: largeNet / 10000, // 转换为万股
      retailInflow: retailInflow === 0 ? 0 : retailInflow, // 确保不返回 -0
      superLargeInflow: data.net_buy_mf_amount || 0,
      mediumInflow: data.net_buy_nr_amount || 0,
    };
  }

  /**
   * 解析 Tushare 日期格式为 Date 对象
   *
   * @param dateStr - Tushare 格式的日期字符串 (YYYYMMDD)
   * @returns Date 对象
   * @private
   */
  private parseTushareDate(dateStr: string): Date {
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1;
    const day = parseInt(dateStr.substring(6, 8), 10);
    return new Date(year, month, day);
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

  /**
   * 格式化交易日期为显示格式 (YYYY-MM-DD)
   *
   * @param date - 日期对象
   * @returns 显示格式的日期字符串
   * @private
   */
  private formatDisplayDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 格式化订单时间为显示格式 (HH:MM:SS)
   *
   * @param date - 日期对象
   * @returns 显示格式的时间字符串
   * @private
   */
  private formatOrderTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * 解析显示格式日期为 Date 对象
   *
   * @param dateStr - 显示格式的日期字符串 (YYYY-MM-DD)
   * @returns Date 对象
   * @private
   */
  private parseDisplayDate(dateStr: string): Date {
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
}
