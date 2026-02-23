/**
 * 回测引擎
 *
 * 基于历史数据的策略回测工具
 * @module data-sources/astock/backtest-engine
 */

import type { BacktestConfig, BacktestResult, BacktestPosition, ScreenerCriteria } from './types';

/**
 * 回测引擎配置
 */
interface BacktestEngineConfig {
  /** Tushare 数据源 */
  tushare?: any;
}

/**
 * 每日净值记录
 */
interface EquityRecord {
  date: string;
  value: number;
  positions: number;
  cash: number;
}

/**
 * 回测引擎
 *
 * 提供历史数据回测功能：
 * - 基于筛选条件的选股回测
 * - 计算收益率、最大回撤、夏普比率等指标
 * - 生成持仓记录和净值曲线
 */
export class BacktestEngine {
  private tushare?: any;

  constructor(config: BacktestEngineConfig = {}) {
    this.tushare = config.tushare;
  }

  /**
   * 运行回测
   */
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    const { strategy, startDate, endDate, initialCapital, holdingPeriod, rebalanceFrequency, maxPositions } = config;

    // 模拟获取历史数据并进行回测
    const positions: BacktestPosition[] = [];
    const equityCurve: EquityRecord[] = [];

    // 模拟交易日（实际需要从 Tushare 获取）
    const tradeDates = this.getTradeDates(startDate, endDate, rebalanceFrequency);

    let cash = initialCapital;
    let totalValue = initialCapital;
    let benchmarkValue = initialCapital;

    // 模拟选股结果（实际需要调用筛选器）
    const selectedStocks = this.mockSelectStocks(strategy, maxPositions);

    for (let i = 0; i < tradeDates.length; i++) {
      const date = tradeDates[i];

      // 模拟调仓日
      if (i % this.getRebalanceInterval(rebalanceFrequency) === 0 && i > 0) {
        // 卖出旧持仓
        positions.forEach(p => {
          if (p.sellDate === undefined) {
            const mockPrice = this.mockGetPrice(p.tsCode, date);
            p.sellDate = date;
            p.sellPrice = mockPrice;
            p.return = ((mockPrice - p.buyPrice) / p.buyPrice) * 100;
            cash += p.quantity * mockPrice;
          }
        });

        // 买入新持仓
        const newStocks = this.mockSelectStocks(strategy, maxPositions);
        const perStockCash = cash / Math.min(newStocks.length, maxPositions);

        newStocks.slice(0, maxPositions).forEach(stock => {
          const price = this.mockGetPrice(stock.tsCode, date);
          const quantity = Math.floor(perStockCash / price);

          if (quantity > 0) {
            positions.push({
              tsCode: stock.tsCode,
              name: stock.name,
              buyDate: date,
              buyPrice: price,
              quantity,
              return: 0,
            });
          }
        });

        cash = perStockCash * Math.max(0, newStocks.length - maxPositions);
      }

      // 更新持仓市值
      let positionsValue = 0;
      positions.forEach(p => {
        if (p.sellDate === undefined) {
          const currentPrice = this.mockGetPrice(p.tsCode, date);
          positionsValue += p.quantity * currentPrice;
        }
      });

      totalValue = cash + positionsValue;

      // 模拟基准收益（沪深300 指数）
      const dailyReturn = (Math.random() - 0.48) * 0.02;
      benchmarkValue *= (1 + dailyReturn);

      equityCurve.push({
        date,
        value: totalValue,
        positions: positions.filter(p => p.sellDate === undefined).length,
        cash,
      });
    }

    // 平仓所有持仓
    const lastDate = tradeDates[tradeDates.length - 1];
    positions.forEach(p => {
      if (p.sellDate === undefined) {
        const mockPrice = this.mockGetPrice(p.tsCode, lastDate);
        p.sellDate = lastDate;
        p.sellPrice = mockPrice;
        p.return = ((mockPrice - p.buyPrice) / p.buyPrice) * 100;
      }
    });

    // 计算指标
    const totalReturn = ((totalValue - initialCapital) / initialCapital) * 100;
    const annualizedReturn = this.calculateAnnualizedReturn(totalReturn, tradeDates.length);
    const benchmarkReturn = ((benchmarkValue - initialCapital) / initialCapital) * 100;
    const alpha = annualizedReturn - benchmarkReturn;
    const beta = this.calculateBeta(equityCurve);
    const maxDrawdown = this.calculateMaxDrawdown(equityCurve);
    const volatility = this.calculateVolatility(equityCurve);
    const sharpeRatio = this.calculateSharpeRatio(volatility, annualizedReturn);

    const closedPositions = positions.filter(p => p.return !== undefined);
    const winCount = closedPositions.filter(p => p.return > 0).length;
    const totalTrades = closedPositions.length;
    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
    const avgWin = closedPositions.filter(p => p.return > 0).reduce((sum, p) => sum + p.return, 0) / Math.max(winCount, 1);
    const avgLoss = closedPositions.filter(p => p.return <= 0).reduce((sum, p) => sum + p.return, 0) / Math.max(totalTrades - winCount, 1);

    return {
      config,
      totalReturn,
      annualizedReturn,
      benchmarkReturn,
      alpha,
      beta,
      maxDrawdown,
      volatility,
      sharpeRatio,
      totalTrades,
      winRate,
      avgWin,
      avgLoss,
      positions: positions.filter(p => p.sellDate !== undefined),
      equityCurve: equityCurve.map(e => ({ date: e.date, value: e.value })),
    };
  }

  /**
   * 对比多个策略
   */
  async compareStrategies(configs: BacktestConfig[]): Promise<BacktestResult[]> {
    const results: BacktestResult[] = [];

    for (const config of configs) {
      const result = await this.runBacktest(config);
      results.push(result);
    }

    return results;
  }

  /**
   * 获取交易日列表
   */
  private getTradeDates(startDate: string, endDate: string, frequency: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate.substring(0, 4), parseInt(startDate.substring(4, 6)) - 1, parseInt(startDate.substring(6, 8)));
    const end = new Date(endDate.substring(0, 4), parseInt(endDate.substring(4, 6)) - 1, parseInt(endDate.substring(6, 8)));

    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // 排除周末
        const dateStr = current.toISOString().substring(0, 10).replace(/-/g, '');
        dates.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }

    // 根据频率筛选
    if (frequency === 'weekly') {
      return dates.filter((_, i) => i % 5 === 0);
    } else if (frequency === 'monthly') {
      return dates.filter((_, i) => i % 20 === 0);
    }

    return dates;
  }

  /**
   * 获取调仓间隔
   */
  private getRebalanceInterval(frequency: string): number {
    switch (frequency) {
      case 'daily': return 1;
      case 'weekly': return 5;
      case 'monthly': return 20;
      default: return 5;
    }
  }

  /**
   * 模拟选股
   */
  private mockSelectStocks(criteria: ScreenerCriteria, limit: number): Array<{ tsCode: string; name: string }> {
    const allStocks = [
      { tsCode: '600519.SH', name: '贵州茅台' },
      { tsCode: '000001.SH', name: '平安银行' },
      { tsCode: '600036.SH', name: '招商银行' },
      { tsCode: '300750.SH', name: '宁德时代' },
      { tsCode: '688981.SH', name: '中芯国际' },
      { tsCode: '002594.SH', name: '比亚迪' },
      { tsCode: '601318.SH', name: '中国平安' },
      { tsCode: '000858.SH', name: '五粮液' },
      { tsCode: '300059.SH', name: '东方财富' },
      { tsCode: '600900.SH', name: '长江电力' },
    ];

    // 简单模拟筛选
    return allStocks.slice(0, Math.min(limit, allStocks.length));
  }

  /**
   * 模拟获取价格
   */
  private mockGetPrice(tsCode: string, date: string): number {
    // 基于股票代码生成伪随机但确定的价格
    const basePrice = parseInt(tsCode.substring(0, 6)) % 500 + 10;
    const dateFactor = parseInt(date.substring(6, 8)) / 100;
    return basePrice * (1 + dateFactor);
  }

  /**
   * 计算年化收益率
   */
  private calculateAnnualizedReturn(totalReturn: number, days: number): number {
    const years = days / 250; // 假设一年250个交易日
    return (Math.pow(1 + totalReturn / 100, 1 / years) - 1) * 100;
  }

  /**
   * 计算 Beta
   */
  private calculateBeta(equityCurve: EquityRecord[]): number {
    // 简化模拟：返回 0.8-1.2 之间的随机值
    return 0.8 + Math.random() * 0.4;
  }

  /**
   * 计算最大回撤
   */
  private calculateMaxDrawdown(equityCurve: EquityRecord[]): number {
    let maxDrawdown = 0;
    let peak = equityCurve[0]?.value || 0;

    for (const record of equityCurve) {
      if (record.value > peak) {
        peak = record.value;
      }
      const drawdown = ((peak - record.value) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * 计算波动率
   */
  private calculateVolatility(equityCurve: EquityRecord[]): number {
    if (equityCurve.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const dailyReturn = (equityCurve[i].value - equityCurve[i - 1].value) / equityCurve[i - 1].value;
      returns.push(dailyReturn);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // 年化波动率
    return stdDev * Math.sqrt(250) * 100;
  }

  /**
   * 计算夏普比率
   */
  private calculateSharpeRatio(volatility: number, annualizedReturn: number): number {
    if (volatility === 0) return 0;
    // 假设无风险利率为 3%
    const riskFreeRate = 3;
    return (annualizedReturn - riskFreeRate) / volatility;
  }
}

/**
 * 创建默认的回测引擎实例
 */
let defaultEngine: BacktestEngine | null = null;

export function getBacktestEngine(config?: BacktestEngineConfig): BacktestEngine {
  if (!defaultEngine) {
    defaultEngine = new BacktestEngine(config);
  }
  return defaultEngine;
}

// 导出类型
export type { BacktestEngineConfig };
