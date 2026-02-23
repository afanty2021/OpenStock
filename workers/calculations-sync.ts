/**
 * 同步计算函数
 *
 * 作为 Web Worker 的后备方案，在 SSR 环境或 Worker 不可用时使用
 *
 * @module workers/calculations-sync
 */

import type {
  LimitPriceParams,
  LimitPriceResult,
  KLineData,
  MAParams,
  MAResult,
  RSIParams,
  RSIResult,
  BollingerBandsParams,
  BollingerBandsResult,
} from './calculations';

/**
 * 同步计算涨跌停价格
 */
export function calculateLimitPriceSync(params: LimitPriceParams): LimitPriceResult {
  const { prevClose, isST = false, isStar = false, isChiNext = false, isBJ = false } = params;

  let upperLimitPercent: number;
  let lowerLimitPercent: number;

  if (isST) {
    upperLimitPercent = 0.05;
    lowerLimitPercent = -0.05;
  } else if (isStar || isChiNext) {
    upperLimitPercent = 0.2;
    lowerLimitPercent = -0.2;
  } else if (isBJ) {
    upperLimitPercent = 0.3;
    lowerLimitPercent = -0.3;
  } else {
    upperLimitPercent = 0.1;
    lowerLimitPercent = -0.1;
  }

  const upperLimit = prevClose * (1 + upperLimitPercent);
  const lowerLimit = prevClose * (1 + lowerLimitPercent);

  return {
    upperLimit,
    lowerLimit,
    upperLimitPercent: upperLimitPercent * 100,
    lowerLimitPercent: lowerLimitPercent * 100,
  };
}

/**
 * 同步计算移动平均线
 */
export function calculateMASync(params: MAParams): MAResult {
  const { data, periods } = params;
  const result: MAResult = {};

  periods.forEach((period) => {
    const ma: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        ma.push(NaN);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j].close;
        }
        ma.push(sum / period);
      }
    }

    result[period.toString()] = ma;
  });

  return result;
}

/**
 * 同步计算 RSI 指标
 */
export function calculateRSISync(params: RSIParams): RSIResult {
  const { data, period = 14 } = params;
  const values: number[] = [];
  const overbought: number[] = [];
  const oversold: number[] = [];

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;

    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    values.push(rsi);

    if (rsi > 70) {
      overbought.push(i);
    } else if (rsi < 30) {
      oversold.push(i);
    }
  }

  return { values, overbought, oversold };
}

/**
 * 同步计算布林带
 */
export function calculateBollingerBandsSync(params: BollingerBandsParams): BollingerBandsResult {
  const { data, period = 20, stdDev = 2 } = params;
  const middle: number[] = [];
  const upper: number[] = [];
  const lower: number[] = [];
  const bandwidth: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      middle.push(NaN);
      upper.push(NaN);
      lower.push(NaN);
      bandwidth.push(NaN);
      continue;
    }

    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    const ma = sum / period;
    middle.push(ma);

    let variance = 0;
    for (let j = 0; j < period; j++) {
      variance += Math.pow(data[i - j].close - ma, 2);
    }
    const std = Math.sqrt(variance / period);

    upper.push(ma + stdDev * std);
    lower.push(ma - stdDev * std);

    const bw = ma === 0 ? 0 : ((ma + std * std) - (ma - std * std)) / ma;
    bandwidth.push(bw);
  }

  return { upper, middle, lower, bandwidth };
}
