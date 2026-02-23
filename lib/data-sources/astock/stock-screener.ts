/**
 * 选股筛选器
 *
 * 基于多条件组合的智能选股筛选工具
 * @module data-sources/astock/stock-screener
 */

import type { ScreenerCriteria, ScreenerResult } from './types';

/**
 * 筛选条件模板
 */
export interface ScreenerCriteriaTemplate {
  /** 字段名称 */
  field: string;
  /** 显示名称 */
  label: string;
  /** 数据类型 */
  type: 'number' | 'range' | 'select' | 'boolean';
  /** 最小值（仅 range 类型）*/
  min?: number;
  /** 最大值（仅 range 类型）*/
  max?: number;
  /** 选项（仅 select 类型）*/
  options?: { value: string; label: string }[];
  /** 默认值 */
  default?: any;
  /** 分组 */
  group: 'market' | 'valuation' | 'profitability' | 'growth' | 'technical' | 'moneyflow';
}

/**
 * 预设策略
 */
export interface PresetStrategy {
  /** 策略 ID */
  id: string;
  /** 策略名称 */
  name: string;
  /** 策略描述 */
  description: string;
  /** 筛选条件 */
  criteria: ScreenerCriteria;
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * 预设策略列表
 */
export const PRESET_STRATEGIES: PresetStrategy[] = [
  {
    id: 'value-investing',
    name: '价值投资',
    description: '低估值、高 ROE 的优质蓝筹股',
    criteria: {
      pe: { min: 0, max: 15 },
      roe: { min: 10 },
      pb: { max: 2 },
    },
    riskLevel: 'low',
  },
  {
    id: 'growth-stocks',
    name: '成长股',
    description: '高增长的成长型企业',
    criteria: {
      revenueGrowth: { min: 20 },
      profitGrowth: { min: 15 },
    },
    riskLevel: 'medium',
  },
  {
    id: 'turnaround',
    name: '困境反转',
    description: '业绩触底反弹的困境反转股',
    criteria: {
      profitGrowth: { min: 10 },
      netMargin: { min: 5 },
    },
    riskLevel: 'high',
  },
  {
    id: 'dividend',
    name: '高股息',
    description: '稳定分红的高股息股票',
    criteria: {
      roe: { min: 8 },
      netMargin: { min: 10 },
    },
    riskLevel: 'low',
  },
  {
    id: 'small-cap',
    name: '小市值成长',
    description: '小市值高成长潜力股',
    criteria: {
      marketCap: { min: 0, max: 100 },
      revenueGrowth: { min: 30 },
    },
    riskLevel: 'high',
  },
  {
    id: 'blue-chip',
    name: '大盘蓝筹',
    description: '稳定收益的大盘蓝筹股',
    criteria: {
      marketCap: { min: 1000 },
      roe: { min: 12 },
      pe: { max: 20 },
    },
    riskLevel: 'low',
  },
];

/**
 * 可用的筛选条件模板
 */
export const SCREENER_CRITERIA_TEMPLATES: ScreenerCriteriaTemplate[] = [
  // 市场条件
  {
    field: 'market',
    label: '市场',
    type: 'select',
    options: [
      { value: 'A', label: 'A股' },
      { value: 'HK', label: '港股' },
      { value: 'US', label: '美股' },
    ],
    default: 'A',
    group: 'market',
  },
  {
    field: 'exchange',
    label: '交易所',
    type: 'select',
    options: [
      { value: 'SH', label: '上海' },
      { value: 'SZ', label: '深圳' },
    ],
    group: 'market',
  },
  // 估值条件
  {
    field: 'pe',
    label: '市盈率 (PE)',
    type: 'range',
    min: 0,
    max: 100,
    group: 'valuation',
  },
  {
    field: 'pb',
    label: '市净率 (PB)',
    type: 'range',
    min: 0,
    max: 20,
    group: 'valuation',
  },
  {
    field: 'marketCap',
    label: '市值 (亿元)',
    type: 'range',
    min: 0,
    max: 100000,
    group: 'valuation',
  },
  // 盈利能力
  {
    field: 'roe',
    label: 'ROE (%)',
    type: 'range',
    min: 0,
    max: 50,
    group: 'profitability',
  },
  {
    field: 'grossMargin',
    label: '毛利率 (%)',
    type: 'range',
    min: 0,
    max: 100,
    group: 'profitability',
  },
  {
    field: 'netMargin',
    label: '净利率 (%)',
    type: 'range',
    min: 0,
    max: 50,
    group: 'profitability',
  },
  // 成长能力
  {
    field: 'revenueGrowth',
    label: '营收增长 (%)',
    type: 'range',
    min: -50,
    max: 100,
    group: 'growth',
  },
  {
    field: 'profitGrowth',
    label: '利润增长 (%)',
    type: 'range',
    min: -50,
    max: 100,
    group: 'growth',
  },
  // 技术指标
  {
    field: 'priceChange',
    label: '日涨跌幅 (%)',
    type: 'range',
    min: -20,
    max: 20,
    group: 'technical',
  },
  {
    field: 'turnoverRate',
    label: '换手率 (%)',
    type: 'range',
    min: 0,
    max: 50,
    group: 'technical',
  },
  // 资金流向
  {
    field: 'netInflow',
    label: '主力净流入 (万元)',
    type: 'range',
    min: 0,
    max: 100000,
    group: 'moneyflow',
  },
  {
    field: 'topListDays',
    label: 'N日内上榜',
    type: 'range',
    min: 0,
    max: 30,
    group: 'moneyflow',
  },
];

/**
 * 选股筛选器配置
 */
interface StockScreenerConfig {
  /** Tushare 数据源 */
  tushare?: any;
  /** 默认返回结果数量 */
  defaultLimit?: number;
}

/**
 * 选股筛选器
 *
 * 提供多条件组合筛选功能：
 * - 支持市场、估值、盈利能力、成长能力等多维度筛选
 * - 预设多种选股策略模板
 * - 支持自定义筛选条件
 */
export class StockScreener {
  private tushare?: any;
  private defaultLimit: number;

  constructor(config: StockScreenerConfig = {}) {
    this.tushare = config.tushare;
    this.defaultLimit = config.defaultLimit || 50;
  }

  /**
   * 执行筛选
   */
  async screen(criteria: ScreenerCriteria, limit?: number): Promise<ScreenerResult[]> {
    const resultLimit = limit || this.defaultLimit;

    // 验证筛选条件
    this.validateCriteria(criteria);

    // 模拟筛选结果（实际需要调用 Tushare API）
    const results = this.mockScreenResults(criteria, resultLimit);

    return results;
  }

  /**
   * 使用预设策略筛选
   */
  async screenWithStrategy(strategyId: string, limit?: number): Promise<ScreenerResult[]> {
    const strategy = PRESET_STRATEGIES.find(s => s.id === strategyId);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    return this.screen(strategy.criteria, limit);
  }

  /**
   * 获取可用的筛选条件模板
   */
  getAvailableCriteria(): ScreenerCriteriaTemplate[] {
    return SCREENER_CRITERIA_TEMPLATES;
  }

  /**
   * 获取预设策略列表
   */
  getPresetStrategies(): PresetStrategy[] {
    return PRESET_STRATEGIES;
  }

  /**
   * 根据分组获取筛选条件
   */
  getCriteriaByGroup(group: ScreenerCriteriaTemplate['group']): ScreenerCriteriaTemplate[] {
    return SCREENER_CRITERIA_TEMPLATES.filter(t => t.group === group);
  }

  /**
   * 验证筛选条件
   */
  private validateCriteria(criteria: ScreenerCriteria): void {
    // 验证 PE
    if (criteria.pe) {
      if (criteria.pe.min !== undefined && criteria.pe.min < 0) {
        throw new Error('PE minimum must be >= 0');
      }
      if (criteria.pe.max !== undefined && criteria.pe.max < 0) {
        throw new Error('PE maximum must be >= 0');
      }
      if (criteria.pe.min !== undefined && criteria.pe.max !== undefined && criteria.pe.min > criteria.pe.max) {
        throw new Error('PE min cannot be greater than max');
      }
    }

    // 验证 PB
    if (criteria.pb) {
      if (criteria.pb.min !== undefined && criteria.pb.min < 0) {
        throw new Error('PB minimum must be >= 0');
      }
      if (criteria.pb.max !== undefined && criteria.pb.max < 0) {
        throw new Error('PB maximum must be >= 0');
      }
    }

    // 验证市值
    if (criteria.marketCap) {
      if (criteria.marketCap.min !== undefined && criteria.marketCap.min < 0) {
        throw new Error('Market cap minimum must be >= 0');
      }
    }

    // 验证百分比字段
    ['roe', 'grossMargin', 'netMargin', 'revenueGrowth', 'profitGrowth', 'priceChange', 'turnoverRate'].forEach(field => {
      const value = criteria[field as keyof ScreenerCriteria] as { min?: number; max?: number } | undefined;
      if (value) {
        if (value.min !== undefined && (value.min < -100 || value.min > 1000)) {
          throw new Error(`${field} minimum out of valid range`);
        }
        if (value.max !== undefined && (value.max < -100 || value.max > 1000)) {
          throw new Error(`${field} maximum out of valid range`);
        }
      }
    });
  }

  /**
   * 计算综合评分
   */
  private calculateScore(criteria: ScreenerCriteria, data: any): number {
    let score = 0;
    let weight = 0;

    // ROE 评分
    if (criteria.roe?.min !== undefined && data.roe) {
      const roeScore = Math.min(data.roe / criteria.roe.min, 2);
      score += roeScore * 25;
      weight += 25;
    }

    // 成长性评分
    if (criteria.revenueGrowth?.min !== undefined && data.revenueGrowth) {
      const growthScore = Math.min(data.revenueGrowth / criteria.revenueGrowth.min, 2);
      score += growthScore * 25;
      weight += 25;
    }

    // 估值评分（PE 越低越好）
    if (criteria.pe?.max !== undefined && data.pe) {
      const peScore = Math.max(0, 2 - data.pe / criteria.pe.max);
      score += peScore * 25;
      weight += 25;
    }

    // 盈利能力评分
    if (criteria.netMargin?.min !== undefined && data.netMargin) {
      const marginScore = Math.min(data.netMargin / criteria.netMargin.min, 2);
      score += marginScore * 25;
      weight += 25;
    }

    return weight > 0 ? score / weight * 100 : 50;
  }

  /**
   * 模拟筛选结果
   * 实际实现需要调用 Tushare API
   */
  private mockScreenResults(criteria: ScreenerCriteria, limit: number): ScreenerResult[] {
    // 模拟股票数据
    const mockStocks = [
      { tsCode: '600519.SH', name: '贵州茅台', pe: 28, pb: 5.2, roe: 25, marketCap: 25000, revenueGrowth: 15, netMargin: 45 },
      { tsCode: '000001.SH', name: '平安银行', pe: 6, pb: 0.8, roe: 12, marketCap: 3500, revenueGrowth: 8, netMargin: 25 },
      { tsCode: '600036.SH', name: '招商银行', pe: 8, pb: 1.2, roe: 15, marketCap: 12000, revenueGrowth: 10, netMargin: 30 },
      { tsCode: '300750.SH', name: '宁德时代', pe: 35, pb: 6.5, roe: 22, marketCap: 8000, revenueGrowth: 80, netMargin: 12 },
      { tsCode: '688981.SH', name: '中芯国际', pe: 45, pb: 3.8, roe: 10, marketCap: 4500, revenueGrowth: 30, netMargin: 15 },
      { tsCode: '002594.SH', name: '比亚迪', pe: 40, pb: 5.5, roe: 18, marketCap: 7000, revenueGrowth: 50, netMargin: 8 },
      { tsCode: '601318.SH', name: '中国平安', pe: 10, pb: 1.5, roe: 14, marketCap: 9000, revenueGrowth: 5, netMargin: 18 },
      { tsCode: '000858.SH', name: '五粮液', pe: 22, pb: 4.2, roe: 20, marketCap: 6500, revenueGrowth: 12, netMargin: 35 },
      { tsCode: '300059.SH', name: '东方财富', pe: 32, pb: 4.0, roe: 16, marketCap: 3200, revenueGrowth: 25, netMargin: 60 },
      { tsCode: '600900.SH', name: '长江电力', pe: 18, pb: 2.2, roe: 14, marketCap: 5500, revenueGrowth: 6, netMargin: 40 },
    ];

    // 根据条件筛选
    let filtered = mockStocks.filter(stock => {
      // PE 筛选
      if (criteria.pe?.min !== undefined && stock.pe < criteria.pe.min) return false;
      if (criteria.pe?.max !== undefined && stock.pe > criteria.pe.max) return false;

      // PB 筛选
      if (criteria.pb?.min !== undefined && stock.pb < criteria.pb.min) return false;
      if (criteria.pb?.max !== undefined && stock.pb > criteria.pb.max) return false;

      // 市值筛选
      if (criteria.marketCap?.min !== undefined && stock.marketCap < criteria.marketCap.min) return false;
      if (criteria.marketCap?.max !== undefined && stock.marketCap > criteria.marketCap.max) return false;

      // ROE 筛选
      if (criteria.roe?.min !== undefined && stock.roe < criteria.roe.min) return false;

      // 毛利率筛选
      if (criteria.grossMargin?.min !== undefined && stock.grossMargin < criteria.grossMargin.min) return false;

      // 净利率筛选
      if (criteria.netMargin?.min !== undefined && stock.netMargin < criteria.netMargin.min) return false;

      // 营收增长筛选
      if (criteria.revenueGrowth?.min !== undefined && stock.revenueGrowth < criteria.revenueGrowth.min) return false;

      // 利润增长筛选
      if (criteria.profitGrowth?.min !== undefined && (stock.profitGrowth || 0) < criteria.profitGrowth.min) return false;

      return true;
    });

    // 计算评分并排序
    filtered = filtered.map(stock => ({
      ...stock,
      score: this.calculateScore(criteria, stock),
      currentPrice: Math.random() * 500 + 10,
      changePercent: (Math.random() - 0.5) * 10,
    }));

    // 按评分排序
    filtered.sort((a, b) => b.score - a.score);

    return filtered.slice(0, limit).map(stock => ({
      tsCode: stock.tsCode,
      name: stock.name,
      currentPrice: stock.currentPrice,
      changePercent: stock.changePercent,
      pe: stock.pe,
      pb: stock.pb,
      roe: stock.roe,
      marketCap: stock.marketCap,
      score: stock.score,
    }));
  }
}

/**
 * 创建默认的选股筛选器实例
 */
let defaultScreener: StockScreener | null = null;

export function getStockScreener(config?: StockScreenerConfig): StockScreener {
  if (!defaultScreener) {
    defaultScreener = new StockScreener(config);
  }
  return defaultScreener;
}

// 导出类型
export type { StockScreenerConfig };
