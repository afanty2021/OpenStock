'use server';

import { TushareSource } from '@/lib/data-sources/sources/tushare';
import { SectorTracker, type SectorRankingItem } from '@/lib/data-sources/astock/sector-tracker';
import { dataCache } from '@/lib/data-sources/cache';

/**
 * 板块热力图数据项
 *
 * 用于前端展示的板块热力图数据
 */
export interface SectorHeatmapData {
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
 * 板块热力图数据响应类型
 */
export type SectorHeatmapResult = {
  success: boolean;
  data?: SectorHeatmapData[];
  tradeDate?: string;
  error?: string;
  cached?: boolean;
};

/**
 * 获取板块热力图数据
 *
 * 返回指定板块类型的资金流向热力图数据
 *
 * @param type - 板块类型（industry=行业, concept=概念）
 * @param limit - 返回条数，默认 50
 * @returns 板块热力图数据响应
 *
 * @example
 * ```ts
 * const result = await getSectorHeatmapData('industry', 50);
 * if (result.success && result.data) {
 *   console.log(result.data[0]); // { tsCode: '801010.SH', name: '农林牧渔', pctChg: 2.5, ... }
 * }
 * ```
 */
export async function getSectorHeatmapData(
  type: 'industry' | 'concept' = 'industry',
  limit: number = 50
): Promise<SectorHeatmapResult> {
  const cacheKey = `sector:heatmap:${type}:${limit}`;

  try {
    // 创建 Tushare 数据源实例（token 从环境变量自动读取）
    const tushare = new TushareSource();
    const tracker = new SectorTracker(tushare);

    // 获取板块排名数据
    const result = await tracker.getSectorRanking(undefined, limit);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to fetch sector heatmap data',
      };
    }

    // 根据类型过滤板块
    let filteredData = result.data;
    if (type === 'industry') {
      // 行业板块：申万一级行业 (801xxx.SH)
      filteredData = result.data.filter(item =>
        item.tsCode.startsWith('801') && item.tsCode.endsWith('.SH')
      );
    } else if (type === 'concept') {
      // 概念板块：以 TS 开头
      filteredData = result.data.filter(item => item.tsCode.startsWith('TS'));
    }

    // 缓存成功获取的数据
    await dataCache.set(cacheKey, filteredData, 60);

    return {
      success: true,
      data: filteredData,
      tradeDate: result.tradeDate,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // 检查是否为非交易时段错误
    if (errorMessage.includes('Market is closed') ||
        errorMessage.includes('非交易时段') ||
        errorMessage.includes('市场关闭') ||
        errorMessage.includes('不在交易时间')) {
      // 尝试返回缓存数据
      try {
        const cached = await dataCache.get(cacheKey) as SectorHeatmapData[] | null;
        if (cached && cached.length > 0) {
          return {
            success: true,
            data: cached,
            cached: true,
          };
        }
      } catch (cacheError) {
        console.error('Failed to retrieve cached heatmap data:', cacheError);
      }

      // 无缓存数据可用
      return {
        success: false,
        error: '当前非交易时段，且无缓存数据可用',
      };
    }

    console.error('Failed to fetch sector heatmap data:', error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 获取板块资金流向分析
 *
 * 返回指定板块的资金流向详细分析
 *
 * @param sectorCode - 板块代码（如 801010.SH 代表申万一级行业-农林牧渔）
 * @returns 资金流向分析结果
 *
 * @example
 * ```ts
 * const result = await getSectorMoneyFlowAnalysis('801010.SH');
 * if (result.success && result.data) {
 *   console.log(result.data.netInflow); // 主力净流入
 * }
 * ```
 */
export async function getSectorMoneyFlowAnalysis(
  sectorCode: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const tushare = new TushareSource();
    const tracker = new SectorTracker(tushare);

    const result = await tracker.analyzeSectorMoneyFlow(sectorCode);

    return {
      success: result.success,
      data: result.data,
      error: result.error,
    };
  } catch (error) {
    console.error('Failed to fetch sector money flow analysis:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * 获取板块成分股
 *
 * 返回指定板块的成分股代码列表
 *
 * @param sectorCode - 板块代码
 * @param sectorType - 板块类型
 * @returns 成分股代码数组
 *
 * @example
 * ```ts
 * const result = await getSectorStocks('801010.SH', 'industry');
 * if (result.success && result.data) {
 *   console.log(result.data); // ['600519.SH', '000001.SZ', ...]
 * }
 * ```
 */
export async function getSectorStocks(
  sectorCode: string,
  sectorType: 'industry' | 'concept' | 'index' = 'industry'
): Promise<{ success: boolean; data?: string[]; error?: string }> {
  try {
    const tushare = new TushareSource();
    const tracker = new SectorTracker(tushare);

    const stocks = await tracker.getSectorStocks(sectorCode, sectorType);

    return {
      success: true,
      data: stocks,
    };
  } catch (error) {
    console.error('Failed to fetch sector stocks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
