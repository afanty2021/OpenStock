/**
 * 财报智能解读器
 *
 * 利用 Tushare 财报数据和 MiniMax AI 提供深度财务分析
 * @module data-sources/astock/financial-report-reader
 */

import { AINewsAnalyzer } from './ai-news-analyzer';
import type { NewsArticle, NewsAnalysisResult } from './types';

/**
 * 财报数据结构
 */
export interface FinancialReport {
  /** 股票代码 */
  tsCode: string;
  /** 报告期 */
  reportDate: string;
  /** 报告类型 */
  reportType: 'annual' | 'quarterly';
  // 利润表
  /** 营业收入 */
  revenue: number;
  /** 净利润 */
  netProfit: number;
  /** 毛利润 */
  grossProfit: number;
  // 资产负债表
  /** 总资产 */
  totalAssets: number;
  /** 总负债 */
  totalLiabilities: number;
  /** 股东权益 */
  equity: number;
  // 现金流量表
  /** 经营现金流 */
  operatingCashFlow: number;
  /** 投资现金流 */
  investingCashFlow: number;
  /** 筹资现金流 */
  financingCashFlow: number;
}

/**
 * 财务指标
 */
export interface FinancialMetrics {
  // 盈利能力
  /** 净资产收益率 % */
  roe: number;
  /** 总资产收益率 % */
  roa: number;
  /** 毛利率 % */
  grossMargin: number;
  /** 净利率 % */
  netMargin: number;
  // 偿债能力
  /** 流动比率 */
  currentRatio: number;
  /** 资产负债率 % */
  debtRatio: number;
  // 成长能力
  /** 营收增长率 % */
  revenueGrowth: number;
  /** 净利润增长率 % */
  profitGrowth: number;
  // 估值
  /** 市盈率 */
  pe: number;
  /** 市净率 */
  pb: number;
}

/**
 * 财报分析结果
 */
export interface FinancialAnalysis {
  /** 财报数据 */
  report: FinancialReport;
  /** 财务指标 */
  metrics: FinancialMetrics;
  /** AI 生成的要点 */
  highlights: string[];
  /** 风险提示 */
  risks: string[];
  /** 投资建议 */
  recommendation: 'buy' | 'hold' | 'sell';
  /** 建议理由 */
  recommendationReason: string;
}

/**
 * 财报解读器配置
 */
interface FinancialReportReaderConfig {
  /** Tushare 数据源（可选，用于获取财报数据）*/
  tushare?: any;
  /** AI 分析器配置 */
  aiConfig?: {
    apiKey?: string;
    baseURL?: string;
    model?: string;
  };
}

/**
 * 财报智能解读器
 *
 * 提供财报数据获取、财务指标计算、AI 解读功能：
 * - 获取三大财务报表数据
 * - 计算关键财务指标
 * - AI 生成投资要点和风险提示
 * - 投资建议生成
 */
export class FinancialReportReader {
  private tushare?: any;
  private aiAnalyzer: AINewsAnalyzer;

  constructor(config: FinancialReportReaderConfig = {}) {
    this.tushare = config.tushare;
    this.aiAnalyzer = new AINewsAnalyzer(config.aiConfig);
  }

  /**
   * 获取财报数据
   * 注意：这里模拟数据，实际需要调用 Tushare 的 income/balance_sheet/cashflow 接口
   */
  async getFinancialReport(tsCode: string, period?: string): Promise<FinancialReport> {
    // 模拟财报数据（实际需要调用 Tushare API）
    // 真实的实现需要调用:
    // - income: 利润表
    // - balance_sheet: 资产负债表
    // - cashflow: 现金流量表

    // 这里返回模拟数据用于开发测试
    const mockData: FinancialReport = {
      tsCode,
      reportDate: period || this.getLatestPeriod(),
      reportType: period?.includes('Q4') ? 'annual' : 'quarterly',
      // 利润表
      revenue: 10000000000, // 100亿
      netProfit: 2500000000, // 25亿
      grossProfit: 6500000000, // 65亿
      // 资产负债表
      totalAssets: 200000000000, // 2000亿
      totalLiabilities: 80000000000, // 800亿
      equity: 120000000000, // 1200亿
      // 现金流量表
      operatingCashFlow: 3000000000, // 30亿
      investingCashFlow: -500000000, // -5亿
      financingCashFlow: -200000000, // -2亿
    };

    return mockData;
  }

  /**
   * 获取财务指标
   */
  async getFinancialMetrics(tsCode: string, periods: number = 4): Promise<FinancialMetrics> {
    const report = await this.getFinancialReport(tsCode);

    // 计算财务指标
    const metrics: FinancialMetrics = {
      // 盈利能力
      roe: (report.netProfit / report.equity) * 100,
      roa: (report.netProfit / report.totalAssets) * 100,
      grossMargin: (report.grossProfit / report.revenue) * 100,
      netMargin: (report.netProfit / report.revenue) * 100,
      // 偿债能力
      currentRatio: 2.5, // 需要流动资产数据，这里简化
      debtRatio: (report.totalLiabilities / report.totalAssets) * 100,
      // 成长能力（需要历史数据）
      revenueGrowth: 15, // 简化
      profitGrowth: 20, // 简化
      // 估值（需要市场数据）
      pe: 25,
      pb: 3.5,
    };

    return metrics;
  }

  /**
   * AI 解读财报
   */
  async analyzeReport(tsCode: string, period?: string): Promise<FinancialAnalysis> {
    const report = await this.getFinancialReport(tsCode, period);
    const metrics = await this.getFinancialMetrics(tsCode);

    // 构建新闻文章格式用于 AI 分析
    const article: NewsArticle = {
      id: `financial-${tsCode}-${period || 'latest'}`,
      title: `${tsCode} ${period || '最新'} 财报分析`,
      content: this.buildFinancialContent(report, metrics),
      source: 'Tushare Financial Data',
      publishedAt: new Date().toISOString(),
      relatedSymbols: [tsCode],
    };

    // 使用 AI 分析
    const aiResult = await this.aiAnalyzer.analyzeNews(article);

    // 生成投资建议
    const { recommendation, recommendationReason } = this.generateRecommendation(metrics, aiResult);

    return {
      report,
      metrics,
      highlights: aiResult.keyEvents.length > 0 ? aiResult.keyEvents : this.generateDefaultHighlights(metrics),
      risks: this.generateRisks(metrics),
      recommendation,
      recommendationReason,
    };
  }

  /**
   * 批量获取多季度对比
   */
  async getQuarterlyComparison(tsCode: string, quarters: number = 4): Promise<FinancialReport[]> {
    const reports: FinancialReport[] = [];
    const currentPeriod = this.getLatestPeriod();

    for (let i = 0; i < quarters; i++) {
      const period = this.getPreviousQuarter(currentPeriod, i);
      const report = await this.getFinancialReport(tsCode, period);
      reports.push(report);
    }

    return reports;
  }

  /**
   * 构建财报内容用于 AI 分析
   */
  private buildFinancialContent(report: FinancialReport, metrics: FinancialMetrics): string {
    return `
公司代码: ${report.tsCode}
报告期: ${report.reportDate}

【利润表现】
- 营业收入: ${(report.revenue / 100000000).toFixed(2)}亿元
- 净利润: ${(report.netProfit / 100000000).toFixed(2)}亿元
- 毛利率: ${metrics.grossMargin.toFixed(2)}%
- 净利率: ${metrics.netMargin.toFixed(2)}%

【资产状况】
- 总资产: ${(report.totalAssets / 100000000).toFixed(2)}亿元
- 总负债: ${(report.totalLiabilities / 100000000).toFixed(2)}亿元
- 股东权益: ${(report.equity / 100000000).toFixed(2)}亿元

【盈利能力】
- ROE: ${metrics.roe.toFixed(2)}%
- ROA: ${metrics.roa.toFixed(2)}%

【估值】
- 市盈率: ${metrics.pe.toFixed(2)}
- 市净率: ${metrics.pb.toFixed(2)}

【成长性】
- 营收增长: ${metrics.revenueGrowth.toFixed(2)}%
- 利润增长: ${metrics.profitGrowth.toFixed(2)}%
    `.trim();
  }

  /**
   * 生成默认要点
   */
  private generateDefaultHighlights(metrics: FinancialMetrics): string[] {
    const highlights: string[] = [];

    if (metrics.roe > 15) {
      highlights.push('ROE 表现优异，超过15%');
    }
    if (metrics.grossMargin > 40) {
      highlights.push('毛利率较高，具有竞争优势');
    }
    if (metrics.revenueGrowth > 20) {
      highlights.push('营收快速增长，成长性好');
    }
    if (metrics.netMargin > 20) {
      highlights.push('净利润率高，盈利能力强');
    }

    return highlights;
  }

  /**
   * 生成风险提示
   */
  private generateRisks(metrics: FinancialMetrics): string[] {
    const risks: string[] = [];

    if (metrics.debtRatio > 70) {
      risks.push('资产负债率较高，偿债风险需关注');
    }
    if (metrics.pe > 50) {
      risks.push('市盈率较高，可能存在估值泡沫');
    }
    if (metrics.profitGrowth < 0) {
      risks.push('净利润下降，需关注盈利能力变化');
    }

    return risks;
  }

  /**
   * 生成投资建议
   */
  private generateRecommendation(
    metrics: FinancialMetrics,
    aiResult: NewsAnalysisResult
  ): { recommendation: 'buy' | 'hold' | 'sell'; recommendationReason: string } {
    // 综合评分
    let score = 0;

    // ROE 评分
    if (metrics.roe > 20) score += 2;
    else if (metrics.roe > 15) score += 1;

    // 成长性评分
    if (metrics.revenueGrowth > 20) score += 2;
    else if (metrics.revenueGrowth > 10) score += 1;
    else if (metrics.revenueGrowth < 0) score -= 1;

    // 盈利能力评分
    if (metrics.netMargin > 20) score += 2;
    else if (metrics.netMargin > 10) score += 1;

    // 估值评分
    if (metrics.pe < 15) score += 1;
    else if (metrics.pe > 50) score -= 2;

    // AI 情感评分
    if (aiResult.sentimentScore > 0.3) score += 1;
    else if (aiResult.sentimentScore < -0.3) score -= 1;

    // 生成建议
    if (score >= 3) {
      return {
        recommendation: 'buy',
        recommendationReason: `综合评分较高（${score}分），ROE ${metrics.roe.toFixed(1)}%，营收增长 ${metrics.revenueGrowth.toFixed(1)}%，${metrics.pe < 30 ? '估值合理' : '估值偏高但成长性好'}`,
      };
    } else if (score >= 0) {
      return {
        recommendation: 'hold',
        recommendationReason: `综合评分中等（${score}分），建议持有观察`,
      };
    } else {
      return {
        recommendation: 'sell',
        recommendationReason: `综合评分较低（${score}分），${metrics.pe > 40 ? '估值偏高' : '盈利能力下滑'}，建议谨慎`,
      };
    }
  }

  /**
   * 获取最新报告期
   */
  private getLatestPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // 根据当前月份确定最新报告期
    if (month >= 5) return `${year}Q1`;
    if (month >= 3) return `${year - 1}Q4`;
    return `${year - 1}Q3`;
  }

  /**
   * 获取之前的季度
   */
  private getPreviousQuarter(current: string, offset: number): string {
    const year = parseInt(current.substring(0, 4));
    const quarter = parseInt(current.substring(2, 3));

    let q = quarter - offset;
    let y = year;

    while (q <= 0) {
      q += 4;
      y -= 1;
    }

    return `${y}Q${q}`;
  }
}

/**
 * 创建默认的财报解读器实例
 */
let defaultReader: FinancialReportReader | null = null;

export function getFinancialReportReader(config?: FinancialReportReaderConfig): FinancialReportReader {
  if (!defaultReader) {
    defaultReader = new FinancialReportReader(config);
  }
  return defaultReader;
}

// 导出类型
export type { FinancialReportReaderConfig };
