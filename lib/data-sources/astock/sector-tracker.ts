/**
 * A 股板块追踪器
 *
 * 提供板块交易数据分析和排名功能
 * @module data-sources/astock/sector-tracker
 */

import { TushareSource, type BlockTradeData } from '../../sources/tushare';
import { TradingCalendar } from './trading-calendar';
import { TradingAwareScheduler } from './trading-aware-scheduler';

/**
 * 板块排名项
 *
 * 用于前端展示的板块排名数据
 */
export interface SectorRankingItem {
  /** 板块代码 */
  tsCode: string;
  /** 板块名称 */
  name: string;
  /** 收盘点位 */
  close: number;
  /** 涨跌幅(%) */
  pctChg: number;
  /** 成交额(万元) */
  amount: number;
  /** 主力净流入(万元) */
  netMfAmount: number;
  /** 排名 */
  rank: number;
}

/**
 * 板块排名结果
 *
 * 板块排名查询的返回结果
 */
export interface SectorRankingResult {
  /** 查询是否成功 */
  success: boolean;
  /** 板块排名数据 */
  data: SectorRankingItem[];
  /** 交易日期 */
  tradeDate: string;
  /** 错误信息（失败时） */
  error?: string;
}

/**
 * 资金流向分析
 *
 * 板块资金流向分析结果
 */
export interface MoneyFlowAnalysis {
  /** 查询是否成功 */
  success: boolean;
  /** 资金流向数据 */
  data?: {
    /** 主力净流入(万元) */
    netInflow: number;
    /** 流入排名 */
    inflowRank: number;
    /** 主力净流入(万元) */
    mainForceInflow: number;
    /** 散户净流入(万元) */
    retailInflow: number;
  };
  /** 错误信息（失败时） */
  error?: string;
}

/**
 * 板块类型
 *
 * 支持的板块分类类型
 */
export type SectorType = 'industry' | 'concept' | 'index';

/**
 * 默认返回条数限制
 *
 * 默认返回前 20 个板块
 */
const DEFAULT_LIMIT = 20;

/**
 * 热门板块默认返回条数
 *
 * 默认返回前 10 个热门板块
 */
const HOT_SECTORS_LIMIT = 10;

/**
 * 趋势查询最大迭代倍数
 *
 * 最多尝试 N 倍的天数来查找交易日
 */
const MAX_ITERATION_MULTIPLIER = 10;

/**
 * 板块代码前缀映射
 *
 * 不同板块类型的代码前缀
 */
const SECTOR_CODE_PREFIXES = {
  /** 申万一级行业 */
  SW_FIRST_LEVEL: '801',
  /** 申万二级行业 */
  SW_SECOND_LEVEL: '802',
  /** 申万三级行业 */
  SW_THIRD_LEVEL: '803',
  /** 概念板块 */
  CONCEPT: 'TS',
} as const;

/**
 * A 股板块追踪器
 *
 * 提供以下功能：
 * - 获取板块涨跌排行
 * - 分析板块资金流向
 * - 识别热门/冷门板块
 * - 获取板块成分股
 *
 * @example
 * ```ts
 * import { TushareSource } from '@/lib/data-sources/sources/tushare';
 * import { SectorTracker } from '@/lib/data-sources/astock';
 *
 * const tushare = new TushareSource();
 * const tracker = new SectorTracker(tushare);
 *
 * // 获取板块涨跌排行
 * const ranking = await tracker.getSectorRanking();
 *
 * // 获取热门板块
 * const hot = await tracker.getHotSectors();
 *
 * // 获取冷门板块
 * const cold = await tracker.getColdSectors();
 *
 * // 获取板块成分股
 * const stocks = await tracker.getSectorStocks('801010.SH');
 * ```
 */
export class SectorTracker {
  /**
   * 构造函数
   *
   * @param tushare - Tushare 数据源实例
   */
  constructor(private readonly tushare: TushareSource) {}

  /**
   * 获取板块涨跌排行
   *
   * 返回指定交易日的板块涨跌排行，按涨跌幅降序排列
   *
   * @param tradeDate - 交易日期（YYYY-MM-DD 格式），默认为最新交易日
   * @param limit - 返回条数，默认 20
   * @returns 板块排名结果
   *
   * @example
   * ```ts
   * const tracker = new SectorTracker(tushare);
   *
   * // 获取最新交易日板块排行
   * const ranking = await tracker.getSectorRanking();
   * console.log(ranking.data[0]); // { tsCode: '801010.SH', name: '农林牧渔', pctChg: 2.5, rank: 1 }
   *
   * // 获取指定日期板块排行
   * const historical = await tracker.getSectorRanking('2026-02-20', 10);
   * ```
   */
  async getSectorRanking(
    tradeDate?: string,
    limit: number = DEFAULT_LIMIT
  ): Promise<SectorRankingResult> {
    // 使用 TradingAwareScheduler 检查是否应该发起请求
    if (!TradingAwareScheduler.shouldRequest()) {
      return {
        success: false,
        data: [],
        tradeDate: tradeDate || '',
        error: 'Market is closed. Data not available in off-hours.',
      };
    }

    // 确定查询日期
    const queryDate = tradeDate
      ? this.parseDisplayDate(tradeDate)
      : new Date();

    // 验证是否为交易日
    if (!TradingCalendar.isTradingDay(queryDate)) {
      return {
        success: false,
        data: [],
        tradeDate: this.formatDisplayDate(queryDate),
        error: `${tradeDate || this.formatDisplayDate(queryDate)} is not a trading day.`,
      };
    }

    // 格式化日期为 Tushare 格式 (YYYYMMDD)
    const tushareDate = this.formatTradeDate(queryDate);

    try {
      // 获取板块交易数据
      const data = await this.tushare.getBlockTrade({
        tradeDate: tushareDate,
      });

      if (data.length === 0) {
        return {
          success: true,
          data: [],
          tradeDate: this.formatDisplayDate(queryDate),
        };
      }

      // 转换并排序
      const rankingItems = this.transformAndRankSectorData(data);

      // 应用 limit 限制
      const limitedData = limit > 0 ? rankingItems.slice(0, limit) : rankingItems;

      return {
        success: true,
        data: limitedData,
        tradeDate: this.formatDisplayDate(queryDate),
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        tradeDate: this.formatDisplayDate(queryDate),
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * 获取热门板块（涨幅榜）
   *
   * 返回指定交易日涨幅最高的板块
   *
   * @param tradeDate - 交易日期（YYYY-MM-DD 格式），默认为最新交易日
   * @param limit - 返回条数，默认 10
   * @returns 板块排名结果
   *
   * @example
   * ```ts
   * const tracker = new SectorTracker(tushare);
   *
   * // 获取热门板块
   * const hot = await tracker.getHotSectors();
   * console.log(hot.data[0]); // 涨幅最高的板块
   * ```
   */
  async getHotSectors(
    tradeDate?: string,
    limit: number = HOT_SECTORS_LIMIT
  ): Promise<SectorRankingResult> {
    const result = await this.getSectorRanking(tradeDate);

    if (!result.success || result.data.length === 0) {
      return result;
    }

    // 过滤涨幅为正的板块
    const hotSectors = result.data.filter(item => item.pctChg > 0);

    return {
      ...result,
      data: hotSectors.slice(0, limit),
    };
  }

  /**
   * 获取冷门板块（跌幅榜）
   *
   * 返回指定交易日跌幅最大的板块
   *
   * @param tradeDate - 交易日期（YYYY-MM-DD 格式），默认为最新交易日
   * @param limit - 返回条数，默认 10
   * @returns 板块排名结果
   *
   * @example
   * ```ts
   * const tracker = new SectorTracker(tushare);
   *
   * // 获取冷门板块
   * const cold = await tracker.getColdSectors();
   * console.log(cold.data[0]); // 跌幅最大的板块
   * ```
   */
  async getColdSectors(
    tradeDate?: string,
    limit: number = HOT_SECTORS_LIMIT
  ): Promise<SectorRankingResult> {
    const result = await this.getSectorRanking(tradeDate);

    if (!result.success || result.data.length === 0) {
      return result;
    }

    // 过滤跌幅为负的板块
    const coldSectors = result.data.filter(item => item.pctChg < 0);

    return {
      ...result,
      data: coldSectors.slice(0, limit),
    };
  }

  /**
   * 获取板块成分股
   *
   * 返回指定板块的成分股代码列表
   *
   * @param sectorCode - 板块代码（如 801010.SH 代表申万一级行业-农林牧渔）
   * @param sectorType - 板块类型（industry/concept/index）
   * @returns 成分股代码数组
   *
   * @example
   * ```ts
   * const tracker = new SectorTracker(tushare);
   *
   * // 获取行业板块成分股
   * const industryStocks = await tracker.getSectorStocks('801010.SH', 'industry');
   * console.log(industryStocks); // ['600519.SH', '000001.SZ', ...]
   *
   * // 获取概念板块成分股
   * const conceptStocks = await tracker.getSectorStocks('TS001', 'concept');
   * ```
   */
  async getSectorStocks(
    sectorCode: string,
    sectorType: SectorType = 'industry'
  ): Promise<string[]> {
    if (!sectorCode) {
      throw new Error('Sector code is required');
    }

    try {
      let stocks: string[] = [];

      switch (sectorType) {
        case 'industry':
        case 'index':
          // 使用 index_classify 接口获取行业板块成分股
          stocks = await this.tushare.getIndexClassify(sectorCode);
          break;

        case 'concept':
          // 使用 concept_detail 接口获取概念板块成分股
          stocks = await this.tushare.getConceptDetail(sectorCode);
          break;

        default:
          throw new Error(`Unsupported sector type: ${sectorType}`);
      }

      return stocks;
    } catch (error) {
      throw new Error(
        `Failed to get sector stocks for ${sectorCode}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 分析板块资金流向
   *
   * 分析指定板块的资金流向情况，包括主力净流入和流入排名
   *
   * @param sectorCode - 板块代码（如 801010.SH 代表申万一级行业-农林牧渔）
   * @param tradeDate - 交易日期（YYYY-MM-DD 格式），默认为最新交易日
   * @returns 资金流向分析结果
   *
   * @example
   * ```ts
   * const tracker = new SectorTracker(tushare);
   *
   * // 分析板块资金流向
   * const analysis = await tracker.analyzeSectorMoneyFlow('801010.SH');
   * console.log(analysis.data); // { netInflow: 10000, inflowRank: 5, ... }
   * ```
   */
  async analyzeSectorMoneyFlow(
    sectorCode: string,
    tradeDate?: string
  ): Promise<MoneyFlowAnalysis> {
    if (!sectorCode) {
      return {
        success: false,
        error: 'Sector code is required',
      };
    }

    // 使用 TradingAwareScheduler 检查是否应该发起请求
    if (!TradingAwareScheduler.shouldRequest()) {
      return {
        success: false,
        error: 'Market is closed. Data not available in off-hours.',
      };
    }

    // 确定查询日期
    const queryDate = tradeDate
      ? this.parseDisplayDate(tradeDate)
      : new Date();

    // 验证是否为交易日
    if (!TradingCalendar.isTradingDay(queryDate)) {
      return {
        success: false,
        error: `${tradeDate || this.formatDisplayDate(queryDate)} is not a trading day.`,
      };
    }

    // 格式化日期为 Tushare 格式 (YYYYMMDD)
    const tushareDate = this.formatTradeDate(queryDate);

    try {
      // 获取指定板块的交易数据
      const sectorData = await this.tushare.getBlockTrade({
        tradeDate: tushareDate,
      });

      // 查找目标板块
      const targetSector = sectorData.find(item => item.ts_code === sectorCode);

      if (!targetSector) {
        return {
          success: false,
          error: `Sector ${sectorCode} not found on ${this.formatDisplayDate(queryDate)}`,
        };
      }

      // 计算流入排名（按主力净流入排序）
      const sortedByInflow = [...sectorData].sort(
        (a, b) => (b.net_mf_amount || 0) - (a.net_mf_amount || 0)
      );
      const inflowRank = sortedByInflow.findIndex(item => item.ts_code === sectorCode) + 1;

      // 计算散户净流入（成交额 - 主力净流入）
      const retailInflow = (targetSector.amount || 0) - (targetSector.net_mf_amount || 0);

      return {
        success: true,
        data: {
          netInflow: targetSector.net_mf_amount || 0,
          inflowRank,
          mainForceInflow: targetSector.net_mf_amount || 0,
          retailInflow,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * 获取板块涨跌趋势（N日）
   *
   * 从当前日期开始，向前查找最近 N 个交易日的板块涨跌数据
   *
   * @param sectorCode - 板块代码（如 801010.SH 代表申万一级行业-农林牧渔）
   * @param days - 交易天数
   * @returns 板块排名结果数组（每个交易日一个结果）
   *
   * @example
   * ```ts
   * const tracker = new SectorTracker(tushare);
   *
   * // 获取板块最近 5 个交易日的涨跌趋势
   * const trend = await tracker.getSectorTrend('801010.SH', 5);
   * trend.forEach(result => {
   *   console.log(result.tradeDate, result.data[0]?.pctChg);
   * });
   * ```
   */
  async getSectorTrend(
    sectorCode: string,
    days: number
  ): Promise<SectorRankingResult[]> {
    if (!sectorCode) {
      throw new Error('Sector code is required');
    }

    if (days <= 0) {
      throw new Error('days must be greater than 0');
    }

    const results: SectorRankingResult[] = [];
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
      const displayDate = this.formatDisplayDate(currentDate);

      try {
        // 获取该日板块数据
        const sectorData = await this.tushare.getBlockTrade({
          tradeDate,
        });

        // 查找目标板块
        const targetSector = sectorData.find(item => item.ts_code === sectorCode);

        if (targetSector) {
          results.push({
            success: true,
            data: [
              {
                tsCode: targetSector.ts_code,
                name: targetSector.name,
                close: targetSector.close,
                pctChg: targetSector.pct_chg,
                amount: targetSector.amount,
                netMfAmount: targetSector.net_mf_amount,
                rank: 0, // 单日查询无排名
              },
            ],
            tradeDate: displayDate,
          });
          collectedDays++;
        }
      } catch (error) {
        // 记录错误但继续处理其他日期
        results.push({
          success: false,
          data: [],
          tradeDate: displayDate,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // 前移一天
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return results;
  }

  /**
   * 转换并排序板块数据
   *
   * 将 Tushare 原始数据转换为标准格式并按涨跌幅排序
   *
   * @param data - Tushare 原始板块数据
   * @returns 排序后的板块排名数组
   * @private
   */
  private transformAndRankSectorData(data: BlockTradeData[]): SectorRankingItem[] {
    // 转换数据格式
    const items: SectorRankingItem[] = data.map((item, index) => ({
      tsCode: item.ts_code,
      name: item.name,
      close: item.close,
      pctChg: item.pct_chg,
      amount: item.amount,
      netMfAmount: item.net_mf_amount,
      rank: index + 1, // 临时排名，排序后更新
    }));

    // 按涨跌幅降序排序（A 股：红色=涨，绿色=跌）
    // Rank 1 = 涨幅最高
    items.sort((a, b) => b.pctChg - a.pctChg);

    // 更新排名
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

  /**
   * 判断板块代码类型
   *
   * 根据板块代码前缀判断板块类型
   *
   * @param sectorCode - 板块代码
   * @returns 板块类型
   *
   * @example
   * ```ts
   * const tracker = new SectorTracker(tushare);
   *
   * console.log(tracker.identifySectorType('801010.SH')); // 'industry'
   * console.log(tracker.identifySectorType('TS001')); // 'concept'
   * ```
   */
  identifySectorType(sectorCode: string): SectorType | null {
    if (sectorCode.startsWith(SECTOR_CODE_PREFIXES.SW_FIRST_LEVEL) ||
        sectorCode.startsWith(SECTOR_CODE_PREFIXES.SW_SECOND_LEVEL) ||
        sectorCode.startsWith(SECTOR_CODE_PREFIXES.SW_THIRD_LEVEL)) {
      return 'industry';
    }

    if (sectorCode.startsWith(SECTOR_CODE_PREFIXES.CONCEPT)) {
      return 'concept';
    }

    return null;
  }
}
