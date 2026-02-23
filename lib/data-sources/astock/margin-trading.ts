/**
 * A 股融资融券数据类
 *
 * 提供融资融券数据获取、趋势分析和多空情绪分析功能
 * @module data-sources/astock/margin-trading
 */

import { TushareSource, type MarginDetailData } from '../../sources/tushare';
import { TradingCalendar } from './trading-calendar';
import { TradingAwareScheduler } from './trading-aware-scheduler';

/**
 * 融资融券数据（标准格式）
 *
 * 用于前端展示的标准化融资融券数据
 */
export interface MarginData {
  /** 股票代码 */
  tsCode: string;
  /** 交易日期 YYYY-MM-DD */
  tradeDate: string;
  /** 融资余额(万元) */
  marginBalance: number;
  /** 融资买入额(万元) */
  marginBuy: number;
  /** 融资偿还额(万元) */
  marginRepay: number;
  /** 融券余额(万元) */
  shortBalance: number;
  /** 融券卖出量(手) */
  shortSell: number;
  /** 融券偿还量(手) */
  shortCover: number;
  /** 融资融券余额比 */
  marginRatio: number;
}

/**
 * 融资融券查询结果
 *
 * 单日融资融券数据查询的返回结果
 */
export interface MarginResult {
  /** 查询是否成功 */
  success: boolean;
  /** 融资融券数据 */
  data?: MarginData;
  /** 错误信息（失败时） */
  error?: string;
}

/**
 * 融资融券趋势结果
 *
 * 多日融资融券趋势查询的返回结果
 */
export interface MarginTrendResult {
  /** 查询是否成功 */
  success: boolean;
  /** 融资融券数据列表 */
  data?: MarginData[];
  /** 趋势分析 */
  trend?: {
    /** 融资余额变化(万元) */
    marginBalanceChange: number;
    /** 融资余额变化率(%) */
    marginBalanceChangeRate: number;
    /** 融券余额变化(万元) */
    shortBalanceChange: number;
    /** 融券余额变化率(%) */
    shortBalanceChangeRate: number;
    /** 融资融券余额比变化 */
    marginRatioChange: number;
    /** 多空情绪 */
    sentiment: 'bullish' | 'bearish' | 'neutral';
  };
  /** 错误信息（失败时） */
  error?: string;
}

/**
 * 多空情绪分析结果
 *
 * 融资融券多空情绪分析的返回结果
 */
export interface SentimentAnalysisResult {
  /** 分析是否成功 */
  success: boolean;
  /** 分析数据 */
  data?: {
    /** 多空情绪 */
    sentiment: 'bullish' | 'bearish' | 'neutral';
    /** 信心度(0-100) */
    confidence: number;
    /** 分析原因 */
    reasons: string[];
  };
  /** 错误信息（失败时） */
  error?: string;
}

/**
 * 默认趋势查询天数
 *
 * 默认查询最近 5 个交易日的趋势
 */
const DEFAULT_TREND_DAYS = 5;

/**
 * 趋势判断阈值（变化率）
 *
 * 变化率超过此值才判断为有明确趋势
 */
const TREND_CHANGE_THRESHOLD = 0.03; // 3%

/**
 * 强趋势判断阈值（变化率）
 *
 * 变化率超过此值判断为强趋势
 */
const STRONG_TREND_THRESHOLD = 0.05; // 5%

/**
 * 融资融券比阈值
 *
 * 融资融券比高于此值表示融资占主导
 */
const MARGIN_RATIO_HIGH = 10;

/**
 * 融资融券比阈值
 *
 * 融资融券比低于此值表示融券占主导
 */
const MARGIN_RATIO_LOW = 5;

/**
 * 信心度计算因子
 *
 * 用于根据变化幅度计算信心度
 */
const CONFIDENCE_FACTOR = 1000;

/**
 * 趋势查询最大迭代倍数
 *
 * 最多尝试 N 倍的天数来查找交易日
 */
const MAX_ITERATION_MULTIPLIER = 10;

/**
 * 最小信心度
 */
const MIN_CONFIDENCE = 30;

/**
 * 最大信心度
 */
const MAX_CONFIDENCE = 95;

/**
 * A 股融资融券数据类
 *
 * 提供以下功能：
 * - 获取融资融券数据
 * - 计算融资融券余额变化
 * - 分析融资融券趋势
 * - 识别多空情绪
 *
 * @example
 * ```ts
 * import { TushareSource } from '@/lib/data-sources/sources/tushare';
 * import { MarginTrading } from '@/lib/data-sources/astock';
 *
 * const tushare = new TushareSource();
 * const margin = new MarginTrading(tushare);
 *
 * // 获取融资融券数据
 * const data = await margin.getMarginData('600519.SH');
 *
 * // 获取融资融券趋势
 * const trend = await margin.getMarginTrend('600519.SH', 5);
 *
 * // 分析多空情绪
 * const sentiment = await margin.analyzeSentiment('600519.SH', 5);
 * ```
 */
export class MarginTrading {
  /**
   * 构造函数
   *
   * @param tushare - Tushare 数据源实例
   */
  constructor(private readonly tushare: TushareSource) {}

  /**
   * 获取融资融券数据
   *
   * 返回指定股票在指定日期的融资融券数据
   *
   * @param symbol - 股票代码（如 600519.SH 或 600519）
   * @param date - 交易日期（YYYY-MM-DD 格式），默认为最新交易日
   * @returns 融资融券查询结果
   *
   * @example
   * ```ts
   * const margin = new MarginTrading(tushare);
   *
   * // 获取最新交易日融资融券数据
   * const result = await margin.getMarginData('600519.SH');
   * console.log(result.data?.marginBalance); // 融资余额
   *
   * // 获取指定日期融资融券数据
   * const result = await margin.getMarginData('600519.SH', '2026-02-20');
   * ```
   */
  async getMarginData(
    symbol: string,
    date?: string
  ): Promise<MarginResult> {
    // 使用 TradingAwareScheduler 检查是否应该发起请求
    if (!TradingAwareScheduler.shouldRequest()) {
      return {
        success: false,
        error: 'Market is closed. Data not available in off-hours.',
      };
    }

    // 确定查询日期
    const queryDate = date
      ? this.parseDisplayDate(date)
      : new Date();

    // 验证是否为交易日
    if (!TradingCalendar.isTradingDay(queryDate)) {
      return {
        success: false,
        error: `${date || this.formatDisplayDate(queryDate)} is not a trading day.`,
      };
    }

    // 格式化日期为 Tushare 格式 (YYYYMMDD)
    const tradeDate = this.formatTradeDate(queryDate);

    try {
      // 获取融资融券数据
      const data = await this.tushare.getMarginDetail({
        tsCode: symbol,
        startDate: tradeDate,
        endDate: tradeDate,
      });

      if (data.length === 0) {
        return {
          success: false,
          error: `No margin data available for ${symbol} on ${tradeDate}`,
        };
      }

      // 转换为标准格式
      return {
        success: true,
        data: this.transformMarginData(data[0], queryDate),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * 获取融资融券趋势（N日）
   *
   * 从当前日期开始，向前查找最近 N 个交易日的融资融券数据
   *
   * @param symbol - 股票代码（如 600519.SH 或 600519）
   * @param days - 交易天数，默认 5
   * @returns 融资融券趋势结果
   *
   * @example
   * ```ts
   * const margin = new MarginTrading(tushare);
   *
   * // 获取最近 5 个交易日融资融券趋势
   * const result = await margin.getMarginTrend('600519.SH', 5);
   * console.log(result.trend?.sentiment); // 'bullish' | 'bearish' | 'neutral'
   * console.log(result.trend?.marginBalanceChange); // 融资余额变化
   * ```
   */
  async getMarginTrend(
    symbol: string,
    days: number = DEFAULT_TREND_DAYS
  ): Promise<MarginTrendResult> {
    if (days <= 0) {
      return {
        success: false,
        error: 'days must be greater than 0',
      };
    }

    const allData: MarginData[] = [];
    let currentDate = new Date();
    let collectedDays = 0;
    const maxIterations = days * MAX_ITERATION_MULTIPLIER;
    let iterations = 0;

    // 向前查找交易日
    while (collectedDays < days && iterations < maxIterations) {
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
        // 获取该日融资融券数据
        const dailyData = await this.tushare.getMarginDetail({
          tsCode: symbol,
          startDate: tradeDate,
          endDate: tradeDate,
        });

        if (dailyData.length > 0) {
          const transformedData = this.transformMarginData(
            dailyData[0],
            currentDate
          );
          allData.push(transformedData);
          collectedDays++;
        }
      } catch (error) {
        // 记录错误但继续处理其他日期
        console.warn(
          `Failed to fetch margin data for ${symbol} on ${tradeDate}:`,
          error
        );
      }

      // 前移一天
      currentDate.setDate(currentDate.getDate() - 1);
    }

    if (allData.length === 0) {
      return {
        success: false,
        error: `No margin data available for ${symbol}`,
      };
    }

    // 分析趋势（allData[0] 是最新的数据）
    const trend = this.analyzeMarginTrend(allData);

    return {
      success: true,
      data: allData,
      trend,
    };
  }

  /**
   * 分析多空情绪
   *
   * 基于融资融券数据分析多空情绪
   *
   * @param symbol - 股票代码（如 600519.SH 或 600519）
   * @param days - 分析天数，默认 5
   * @returns 多空情绪分析结果
   *
   * @example
   * ```ts
   * const margin = new MarginTrading(tushare);
   *
   * // 分析多空情绪
   * const result = await margin.analyzeSentiment('600519.SH', 5);
   * console.log(result.data?.sentiment); // 'bullish' | 'bearish' | 'neutral'
   * console.log(result.data?.confidence); // 0-100
   * console.log(result.data?.reasons); // ['融资余额增加', '融资买入 > 偿还']
   * ```
   */
  async analyzeSentiment(
    symbol: string,
    days: number = DEFAULT_TREND_DAYS
  ): Promise<SentimentAnalysisResult> {
    // 获取融资融券趋势
    const trendResult = await this.getMarginTrend(symbol, days);

    if (!trendResult.success || !trendResult.data || trendResult.data.length === 0) {
      return {
        success: false,
        error: trendResult.error || 'No margin data available',
      };
    }

    if (!trendResult.trend) {
      return {
        success: false,
        error: 'Failed to analyze margin trend',
      };
    }

    // 分析多空情绪
    const sentiment = this.determineSentiment(trendResult.trend);

    return {
      success: true,
      data: sentiment,
    };
  }

  /**
   * 分析融资融券趋势
   *
   * @param data - 融资融券数据数组（data[0] 是最新数据）
   * @returns 趋势分析结果
   * @private
   */
  private analyzeMarginTrend(data: MarginData[]): MarginTrendResult['trend'] {
    if (data.length < 2) {
      return {
        marginBalanceChange: 0,
        marginBalanceChangeRate: 0,
        shortBalanceChange: 0,
        shortBalanceChangeRate: 0,
        marginRatioChange: 0,
        sentiment: 'neutral',
      };
    }

    // data[0] 是最新的数据，data[data.length - 1] 是最早的数据
    const latest = data[0];
    const earliest = data[data.length - 1];

    // 计算融资余额变化
    const marginBalanceChange = latest.marginBalance - earliest.marginBalance;
    const marginBalanceChangeRate = earliest.marginBalance > 0
      ? (marginBalanceChange / earliest.marginBalance) * 100
      : 0;

    // 计算融券余额变化
    const shortBalanceChange = latest.shortBalance - earliest.shortBalance;
    const shortBalanceChangeRate = earliest.shortBalance > 0
      ? (shortBalanceChange / earliest.shortBalance) * 100
      : 0;

    // 计算融资融券比变化
    const marginRatioChange = latest.marginRatio - earliest.marginRatio;

    // 判断多空情绪
    const sentiment = this.determineTrendSentiment(
      marginBalanceChangeRate,
      shortBalanceChangeRate,
      marginRatioChange
    );

    return {
      marginBalanceChange,
      marginBalanceChangeRate,
      shortBalanceChange,
      shortBalanceChangeRate,
      marginRatioChange,
      sentiment,
    };
  }

  /**
   * 确定趋势多空情绪
   *
   * @param marginChangeRate - 融资余额变化率
   * @param shortChangeRate - 融券余额变化率
   * @param marginRatioChange - 融资融券比变化
   * @returns 多空情绪
   * @private
   */
  private determineTrendSentiment(
    marginChangeRate: number,
    shortChangeRate: number,
    marginRatioChange: number
  ): 'bullish' | 'bearish' | 'neutral' {
    // 看涨信号：
    // 1. 融资余额增加显著 > 融券余额增加
    // 2. 融资融券比上升
    // 3. 融资增长为正且融券增长为负或很小

    const marginDiff = marginChangeRate - shortChangeRate;

    if (marginChangeRate > TREND_CHANGE_THRESHOLD * 100 &&
        marginDiff > TREND_CHANGE_THRESHOLD * 100 &&
        marginRatioChange > 0) {
      return 'bullish';
    }

    // 看跌信号：
    // 1. 融券余额增加显著 > 融资余额增加
    // 2. 融资融券比下降
    // 3. 融资增长为负或很小且融券增长为正

    if (shortChangeRate > TREND_CHANGE_THRESHOLD * 100 &&
        marginDiff < -TREND_CHANGE_THRESHOLD * 100 &&
        marginRatioChange < 0) {
      return 'bearish';
    }

    // 其他情况为中性
    return 'neutral';
  }

  /**
   * 确定多空情绪及信心度
   *
   * @param trend - 趋势数据
   * @returns 多空情绪分析结果
   * @private
   */
  private determineSentiment(
    trend: NonNullable<MarginTrendResult['trend']>
  ): SentimentAnalysisResult['data'] {
    const {
      marginBalanceChangeRate,
      shortBalanceChangeRate,
      marginRatioChange,
      sentiment: trendSentiment,
    } = trend;

    const reasons: string[] = [];
    let confidence = MIN_CONFIDENCE;
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';

    // 计算变化幅度（用于信心度）
    const changeMagnitude = Math.abs(marginBalanceChangeRate) +
                           Math.abs(shortBalanceChangeRate) +
                           Math.abs(marginRatioChange) * 10;

    // 基础信心度（根据变化幅度）
    confidence = Math.min(
      MAX_CONFIDENCE,
      MIN_CONFIDENCE + Math.min(changeMagnitude * CONFIDENCE_FACTOR / 100, MAX_CONFIDENCE - MIN_CONFIDENCE)
    );

    // 看涨分析
    if (marginBalanceChangeRate > TREND_CHANGE_THRESHOLD * 100) {
      reasons.push(`融资余额增加 ${marginBalanceChangeRate.toFixed(2)}%`);
      sentiment = 'bullish';

      // 强信号加成
      if (marginBalanceChangeRate > STRONG_TREND_THRESHOLD * 100) {
        confidence += 10;
        reasons.push('融资余额强劲增长');
      }
    } else if (marginBalanceChangeRate < -TREND_CHANGE_THRESHOLD * 100) {
      reasons.push(`融资余额减少 ${Math.abs(marginBalanceChangeRate).toFixed(2)}%`);
      sentiment = 'bearish';

      if (marginBalanceChangeRate < -STRONG_TREND_THRESHOLD * 100) {
        confidence += 10;
        reasons.push('融资余额持续萎缩');
      }
    }

    // 融券分析
    if (shortBalanceChangeRate > TREND_CHANGE_THRESHOLD * 100) {
      reasons.push(`融券余额增加 ${shortBalanceChangeRate.toFixed(2)}%`);
      if (sentiment === 'bullish') {
        sentiment = 'neutral';
        confidence -= 10;
      } else if (sentiment === 'neutral') {
        sentiment = 'bearish';
      }
    } else if (shortBalanceChangeRate < -TREND_CHANGE_THRESHOLD * 100) {
      reasons.push(`融券余额减少 ${Math.abs(shortBalanceChangeRate).toFixed(2)}%`);
      if (sentiment === 'bearish') {
        sentiment = 'neutral';
      } else if (sentiment === 'neutral') {
        sentiment = 'bullish';
        confidence += 5;
      }
    }

    // 融资融券比分析
    if (marginRatioChange > 0) {
      reasons.push(`融资融券比上升 ${marginRatioChange.toFixed(2)}`);
      if (sentiment === 'bullish') {
        confidence += 5;
      }
    } else if (marginRatioChange < 0) {
      reasons.push(`融资融券比下降 ${Math.abs(marginRatioChange).toFixed(2)}`);
      if (sentiment === 'bearish') {
        confidence += 5;
      }
    }

    // 如果没有明确信号
    if (reasons.length === 0) {
      reasons.push('融资融券变化平稳');
      sentiment = 'neutral';
    }

    // 确保信心度在合理范围内
    confidence = Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, confidence));

    return {
      sentiment: sentiment || 'neutral',
      confidence: Math.round(confidence),
      reasons,
    };
  }

  /**
   * 转换 Tushare 融资融券数据为标准格式
   *
   * @param data - Tushare 原始数据
   * @param date - 交易日期
   * @returns 标准格式融资融券数据
   * @private
   */
  private transformMarginData(
    data: MarginDetailData,
    date: Date
  ): MarginData {
    // 使用 Tushare 数据中的日期（如果有的话），否则使用传入的日期
    const tradeDate = data.trade_date
      ? this.parseTushareDate(data.trade_date)
      : date;

    return {
      tsCode: data.ts_code,
      tradeDate: this.formatDisplayDate(tradeDate),
      marginBalance: data.rz_ratio || 0,
      marginBuy: data.rz_che || 0,
      marginRepay: data.rz_ch || 0,
      shortBalance: data.rq_ratio || 0,
      shortSell: data.rq_che || 0,
      shortCover: data.rq_ch || 0,
      marginRatio: data.rz_rq_ratio || 0,
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
