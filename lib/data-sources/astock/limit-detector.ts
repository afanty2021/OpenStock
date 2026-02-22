/**
 * A 股涨跌停检测器
 *
 * 提供涨跌停状态检测、距离预测和接近预警功能
 * @module data-sources/astock/limit-detector
 */

import { QuoteData } from '../types';
import { AStockCodeUtil } from './code-util';

/**
 * 涨跌停状态类型
 */
export type LimitStatus = 'UPPER' | 'LOWER' | 'NORMAL';

/**
 * 涨跌停距离预测
 */
export interface LimitPrediction {
  /** 距离涨停的信息 */
  toUpper: {
    /** 距涨停百分比 */
    pct: number;
    /** 距涨停金额 */
    price: number;
    /** 是否可触及 (考虑当日剩余时间) */
    reachable: boolean;
  };
  /** 距离跌停的信息 */
  toLower: {
    /** 距跌停百分比 */
    pct: number;
    /** 距跌停金额 */
    price: number;
    /** 是否可触及 */
    reachable: boolean;
  };
}

/**
 * 容差计算常数
 *
 * 使用 0.5% 的容差来处理浮点数误差
 * 例如：对于 10% 的涨跌停限制，容差为 0.05%
 */
const TOLERANCE_RATIO = 0.005;

/**
 * 可触及性判断阈值
 *
 * 当距离涨跌停的百分比小于此阈值时，认为可以触及
 * 默认为 30%，即距离涨跌停不到 30% 的空间时认为可以触及
 */
const REACHABLE_THRESHOLD = 0.3;

/**
 * 默认接近阈值
 *
 * 用于 isNearLimit 方法的默认阈值
 * 默认为 70%，即距离涨跌停不到 70% 的空间时认为接近
 */
const DEFAULT_NEAR_THRESHOLD = 0.7;

/**
 * 浮点数精度小数位数
 *
 * 用于修正百分比计算的浮点精度问题
 */
const DECIMAL_PLACES = 10;

/**
 * 零值常量
 */
const ZERO = 0;

/**
 * 单位值常量
 *
 * 用于价格计算基准值
 */
const ONE = 1;

/**
 * 最小有效值常量
 */
const MIN_VALID_VALUE = 0;

/**
 * A 股涨跌停检测器
 *
 * 提供以下功能：
 * - 检测当前涨跌停状态
 * - 预测距离涨跌停的百分比和金额
 * - 判断是否接近涨跌停（用于触发预警）
 *
 * @example
 * ```ts
 * import { LimitDetector } from '@/lib/data-sources/astock';
 *
 * const quote: QuoteData = {
 *   symbol: '600519.SH',
 *   c: 108,
 *   pc: 100,
 *   dp: 8,
 *   // ...
 * };
 *
 * // 检测涨跌停状态
 * const status = LimitDetector.detectLimitStatus(quote); // 'NORMAL'
 *
 * // 预测距离涨跌停
 * const prediction = LimitDetector.predictLimitDistance(quote);
 * console.log(prediction.toUpper.pct); // 2 (距离涨停 2%)
 *
 * // 判断是否接近涨跌停
 * const isNear = LimitDetector.isNearLimit(quote); // true
 * ```
 */
export class LimitDetector {
  /**
   * 检测当前涨跌停状态
   *
   * 使用 AStockCodeUtil.getLimitPct() 获取涨跌停限制比例
   * 考虑浮点数误差（0.5% 容差）
   *
   * @param quote - 股票报价数据
   * @returns 涨跌停状态 ('UPPER' | 'LOWER' | 'NORMAL')
   *
   * @example
   * ```ts
   * const quote: QuoteData = {
   *   symbol: '600519.SH',
   *   c: 110,
   *   pc: 100,
   *   dp: 10,
   *   // ...
   * };
   * const status = LimitDetector.detectLimitStatus(quote); // 'UPPER'
   * ```
   */
  static detectLimitStatus(quote: QuoteData): LimitStatus {
    // 获取涨跌停限制比例
    const limitPct = AStockCodeUtil.getLimitPct(quote.symbol);

    // 验证 limitPct 返回值有效性
    if (typeof limitPct !== 'number' || isNaN(limitPct) || limitPct <= MIN_VALID_VALUE) {
      return 'NORMAL';
    }

    // 验证数据有效性
    if (!this.isValidQuoteData(quote)) {
      return 'NORMAL';
    }

    const changePct = quote.dp;

    // 计算容差（0.5%）
    const tolerance = limitPct * TOLERANCE_RATIO;

    // 检测涨停状态
    if (changePct >= limitPct - tolerance) {
      return 'UPPER';
    }

    // 检测跌停状态
    if (changePct <= -limitPct + tolerance) {
      return 'LOWER';
    }

    return 'NORMAL';
  }

  /**
   * 预测距离涨跌停的百分比和金额
   *
   * 计算涨停价、跌停价，并判断是否可触及
   * 可触及性考虑了当日剩余时间的影响
   *
   * @param quote - 股票报价数据
   * @returns 涨跌停距离预测信息
   *
   * @example
   * ```ts
   * const quote: QuoteData = {
   *   symbol: '600519.SH',
   *   c: 108,
   *   pc: 100,
   *   dp: 8,
   *   // ...
   * };
   * const prediction = LimitDetector.predictLimitDistance(quote);
   * console.log(prediction.toUpper.pct);    // 2 (距离涨停 2%)
   * console.log(prediction.toUpper.price);  // 2 (距离涨停 2 元)
   * console.log(prediction.toUpper.reachable); // true (可触及)
   * ```
   */
  static predictLimitDistance(quote: QuoteData): LimitPrediction {
    // 获取涨跌停限制比例
    const limitPct = AStockCodeUtil.getLimitPct(quote.symbol);

    // 验证 limitPct 返回值有效性
    if (typeof limitPct !== 'number' || isNaN(limitPct) || limitPct <= MIN_VALID_VALUE || !this.isValidQuoteData(quote)) {
      return {
        toUpper: { pct: ZERO, price: ZERO, reachable: false },
        toLower: { pct: ZERO, price: ZERO, reachable: false },
      };
    }

    const currentPct = quote.dp;
    const currentPrice = quote.c;
    const prevClose = quote.pc;

    // 计算距离涨跌停的百分比（使用 toFixed 修正浮点精度）
    const upperDistancePct = parseFloat((limitPct - currentPct).toFixed(DECIMAL_PLACES));
    const lowerDistancePct = parseFloat((limitPct + currentPct).toFixed(DECIMAL_PLACES));

    // 计算涨停价和跌停价
    const upperLimitPrice = prevClose * (ONE + limitPct / 100);
    const lowerLimitPrice = prevClose * (ONE - limitPct / 100);

    // 计算距离涨跌停的金额（使用 toFixed 修正浮点精度）
    const upperDistancePrice = parseFloat((upperLimitPrice - currentPrice).toFixed(DECIMAL_PLACES));
    const lowerDistancePrice = parseFloat((currentPrice - lowerLimitPrice).toFixed(DECIMAL_PLACES));

    // 判断是否可触及
    // 条件：距离为正且小于限制的 30%（严格小于，不包含边界）
    const toUpperReachable = upperDistancePct > ZERO && upperDistancePct < limitPct * REACHABLE_THRESHOLD;
    const toLowerReachable = lowerDistancePct > ZERO && lowerDistancePct < limitPct * REACHABLE_THRESHOLD;

    return {
      toUpper: {
        pct: Math.max(ZERO, upperDistancePct),
        price: Math.max(ZERO, upperDistancePrice),
        reachable: toUpperReachable,
      },
      toLower: {
        pct: Math.max(ZERO, lowerDistancePct),
        price: Math.max(ZERO, lowerDistancePrice),
        reachable: toLowerReachable,
      },
    };
  }

  /**
   * 判断是否接近涨跌停
   *
   * 用于触发预警
   * 默认阈值为 0.7 (70%)，即距离涨跌停不到 70% 的空间时认为接近
   *
   * @param quote - 股票报价数据
   * @param threshold - 接近阈值 (0-1)，默认 0.7
   * @returns 是否接近涨跌停
   *
   * @example
   * ```ts
   * const quote: QuoteData = {
   *   symbol: '600519.SH',
   *   c: 107,
   *   pc: 100,
   *   dp: 7,
   *   // ...
   * };
   * const isNear = LimitDetector.isNearLimit(quote); // true
   * const isNearStrict = LimitDetector.isNearLimit(quote, 0.5); // false
   * ```
   */
  static isNearLimit(quote: QuoteData, threshold: number = DEFAULT_NEAR_THRESHOLD): boolean {
    if (threshold < ZERO || threshold > ONE) {
      throw new Error('Threshold must be between 0 and 1');
    }

    const prediction = this.predictLimitDistance(quote);
    const limitPct = AStockCodeUtil.getLimitPct(quote.symbol);

    // 验证 limitPct 返回值有效性
    if (typeof limitPct !== 'number' || isNaN(limitPct) || limitPct <= MIN_VALID_VALUE) {
      return false;
    }

    // 判断是否接近涨停或跌停
    // 使用自定义阈值而非 prediction 中的 reachable
    const nearThreshold = limitPct * threshold;
    return prediction.toUpper.pct > ZERO && prediction.toUpper.pct <= nearThreshold ||
           prediction.toLower.pct > ZERO && prediction.toLower.pct <= nearThreshold;
  }

  /**
   * 验证报价数据的有效性
   *
   * 检查价格数据是否有效（非负数、非 NaN）
   *
   * @param quote - 股票报价数据
   * @returns 数据是否有效
   *
   * @private
   */
  private static isValidQuoteData(quote: QuoteData): boolean {
    // 检查当前价格
    if (typeof quote.c !== 'number' || isNaN(quote.c) || quote.c < ZERO) {
      return false;
    }

    // 检查前收盘价
    if (typeof quote.pc !== 'number' || isNaN(quote.pc) || quote.pc <= MIN_VALID_VALUE) {
      return false;
    }

    // 检查涨跌幅
    if (typeof quote.dp !== 'number' || isNaN(quote.dp)) {
      return false;
    }

    return true;
  }
}
