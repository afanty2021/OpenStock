/**
 * Web Worker 处理复杂计算
 *
 * 将计算密集型任务移至 Web Worker，避免阻塞主线程
 * 包括：涨跌停价格计算、技术指标计算等
 *
 * @module workers/calculations
 */

/**
 * Worker 消息类型
 */
export enum WorkerMessageType {
  /** 计算涨跌停价格 */
  CALCULATE_LIMIT_PRICE = 'CALCULATE_LIMIT_PRICE',
  /** 批量计算涨跌停价格 */
  CALCULATE_LIMIT_PRICES = 'CALCULATE_LIMIT_PRICES',
  /** 计算移动平均线 */
  CALCULATE_MA = 'CALCULATE_MA',
  /** 计算 RSI 指标 */
  CALCULATE_RSI = 'CALCULATE_RSI',
  /** 计算布林带 */
  CALCULATE_BOLLINGER_BANDS = 'CALCULATE_BOLLINGER_BANDS',
}

/**
 * 涨跌停价格计算参数
 */
export interface LimitPriceParams {
  /** 昨收价 */
  prevClose: number;
  /** 是否为 ST 股票 */
  isST?: boolean;
  /** 是否为科创板 */
  isStar?: boolean;
  /** 是否为创业板 */
  isChiNext?: boolean;
  /** 是否为北交所 */
  isBJ?: boolean;
}

/**
 * 涨跌停价格计算结果
 */
export interface LimitPriceResult {
  /** 涨停价 */
  upperLimit: number;
  /** 跌停价 */
  lowerLimit: number;
  /** 涨幅 (%) */
  upperLimitPercent: number;
  /** 跌幅 (%) */
  lowerLimitPercent: number;
}

/**
 * K线数据点
 */
export interface KLineData {
  /** 时间戳 */
  timestamp: number;
  /** 开盘价 */
  open: number;
  /** 最高价 */
  high: number;
  /** 最低价 */
  low: number;
  /** 收盘价 */
  close: number;
  /** 成交量 */
  volume?: number;
}

/**
 * 移动平均线参数
 */
export interface MAParams {
  /** K线数据 */
  data: KLineData[];
  /** MA 周期 */
  periods: number[];
}

/**
 * 移动平均线结果
 */
export interface MAResult {
  /** MA 数据，键为周期 */
  [period: string]: number[];
}

/**
 * RSI 指标参数
 */
export interface RSIParams {
  /** K线数据 */
  data: KLineData[];
  /** RSI 周期 */
  period?: number;
}

/**
 * RSI 指标结果
 */
export interface RSIResult {
  /** RSI 值数组 */
  values: number[];
  /** 超买区域 (>70) 的索引 */
  overbought: number[];
  /** 超卖区域 (<30) 的索引 */
  oversold: number[];
}

/**
 * 布林带参数
 */
export interface BollingerBandsParams {
  /** K线数据 */
  data: KLineData[];
  /** 周期 */
  period?: number;
  /** 标准差倍数 */
  stdDev?: number;
}

/**
 * 布林带结果
 */
export interface BollingerBandsResult {
  /** 上轨 */
  upper: number[];
  /** 中轨 */
  middle: number[];
  /** 下轨 */
  lower: number[];
  /** 带宽 */
  bandwidth: number[];
}

/**
 * 计算涨跌停价格
 */
function calculateLimitPrice(params: LimitPriceParams): LimitPriceResult {
  const { prevClose, isST = false, isStar = false, isChiNext = false, isBJ = false } = params;

  // A股涨跌幅限制
  let upperLimitPercent: number;
  let lowerLimitPercent: number;

  if (isST) {
    // ST 股票：5%
    upperLimitPercent = 0.05;
    lowerLimitPercent = -0.05;
  } else if (isStar || isChiNext) {
    // 科创板和创业板：20%
    upperLimitPercent = 0.2;
    lowerLimitPercent = -0.2;
  } else if (isBJ) {
    // 北交所：30%
    upperLimitPercent = 0.3;
    lowerLimitPercent = -0.3;
  } else {
    // 主板：10%
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
 * 批量计算涨跌停价格
 */
function calculateLimitPrices(paramsArray: LimitPriceParams[]): LimitPriceResult[] {
  return paramsArray.map(calculateLimitPrice);
}

/**
 * 计算移动平均线
 */
function calculateMA(params: MAParams): MAResult {
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
 * 计算 RSI 指标
 */
function calculateRSI(params: RSIParams): RSIResult {
  const { data, period = 14 } = params;
  const values: number[] = [];
  const overbought: number[] = [];
  const oversold: number[] = [];

  let gains = 0;
  let losses = 0;

  // 计算初始平均涨跌
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

  // 计算 RSI
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
 * 计算布林带
 */
function calculateBollingerBands(params: BollingerBandsParams): BollingerBandsResult {
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

    // 计算中轨（MA）
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    const ma = sum / period;
    middle.push(ma);

    // 计算标准差
    let variance = 0;
    for (let j = 0; j < period; j++) {
      variance += Math.pow(data[i - j].close - ma, 2);
    }
    const std = Math.sqrt(variance / period);

    // 计算上下轨
    upper.push(ma + stdDev * std);
    lower.push(ma - stdDev * std);

    // 计算带宽
    const bw = ((ma - std * stdDev) === 0) ? 0 : ((ma + std * std) - (ma - std * std)) / ma;
    bandwidth.push(bw);
  }

  return { upper, middle, lower, bandwidth };
}

/**
 * Worker 消息处理
 */
self.addEventListener('message', (event: MessageEvent) => {
  const { type, payload, id } = event.data;

  try {
    let result;

    switch (type) {
      case WorkerMessageType.CALCULATE_LIMIT_PRICE:
        result = calculateLimitPrice(payload as LimitPriceParams);
        break;

      case WorkerMessageType.CALCULATE_LIMIT_PRICES:
        result = calculateLimitPrices(payload as LimitPriceParams[]);
        break;

      case WorkerMessageType.CALCULATE_MA:
        result = calculateMA(payload as MAParams);
        break;

      case WorkerMessageType.CALCULATE_RSI:
        result = calculateRSI(payload as RSIParams);
        break;

      case WorkerMessageType.CALCULATE_BOLLINGER_BANDS:
        result = calculateBollingerBands(payload as BollingerBandsParams);
        break;

      default:
        throw new Error(`Unknown worker message type: ${type}`);
    }

    self.postMessage({
      id,
      type,
      success: true,
      result,
    });
  } catch (error) {
    self.postMessage({
      id,
      type,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 导出类型供外部使用
export type {
  LimitPriceParams,
  LimitPriceResult,
  KLineData,
  MAParams,
  MAResult,
  RSIParams,
  RSIResult,
  BollingerBandsParams,
  BollingerBandsResult,
};
