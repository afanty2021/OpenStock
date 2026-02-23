/**
 * 财报智能解读器单元测试
 * @module data-sources/astock/__tests__/financial-report-reader.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FinancialReportReader,
  getFinancialReportReader,
  type FinancialReport,
  type FinancialMetrics,
  type FinancialAnalysis,
} from '../financial-report-reader';

// Mock AINewsAnalyzer
const mockAnalyzeNews = vi.fn().mockResolvedValue({
  sentiment: 'bullish' as const,
  sentimentScore: 0.8,
  keyEvents: ['营收增长20%', '净利润超预期'],
  impactStocks: ['600519'],
  summary: '财报表现亮眼',
  riskLevel: 'low' as const,
});

vi.mock('../ai-news-analyzer', () => ({
  AINewsAnalyzer: class {
    analyzeNews = mockAnalyzeNews;
  },
}));

describe('FinancialReportReader', () => {
  let reader: FinancialReportReader;

  beforeEach(() => {
    vi.clearAllMocks();
    reader = new FinancialReportReader();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const r = new FinancialReportReader();
      expect(r).toBeInstanceOf(FinancialReportReader);
    });

    it('should create instance with custom config', () => {
      const r = new FinancialReportReader({
        aiConfig: { apiKey: 'custom-key' },
      });
      expect(r).toBeInstanceOf(FinancialReportReader);
    });
  });

  describe('getFinancialReport', () => {
    it('should return financial report data', async () => {
      const report = await reader.getFinancialReport('600519.SH');

      expect(report.tsCode).toBe('600519.SH');
      expect(report.revenue).toBeGreaterThan(0);
      expect(report.netProfit).toBeGreaterThan(0);
      expect(report.totalAssets).toBeGreaterThan(0);
      expect(report.equity).toBeGreaterThan(0);
    });

    it('should use custom period if provided', async () => {
      const report = await reader.getFinancialReport('600519.SH', '2023Q4');

      expect(report.reportDate).toBe('2023Q4');
      expect(report.reportType).toBe('annual');
    });

    it('should identify annual report correctly', async () => {
      const report = await reader.getFinancialReport('600519.SH', '2024Q4');

      expect(report.reportType).toBe('annual');
    });

    it('should identify quarterly report correctly', async () => {
      const report = await reader.getFinancialReport('600519.SH', '2024Q1');

      expect(report.reportType).toBe('quarterly');
    });

    it('should have all required financial fields', async () => {
      const report = await reader.getFinancialReport('600519.SH');

      expect(report).toHaveProperty('revenue');
      expect(report).toHaveProperty('netProfit');
      expect(report).toHaveProperty('grossProfit');
      expect(report).toHaveProperty('totalAssets');
      expect(report).toHaveProperty('totalLiabilities');
      expect(report).toHaveProperty('equity');
      expect(report).toHaveProperty('operatingCashFlow');
      expect(report).toHaveProperty('investingCashFlow');
      expect(report).toHaveProperty('financingCashFlow');
    });
  });

  describe('getFinancialMetrics', () => {
    it('should calculate ROE correctly', async () => {
      const metrics = await reader.getFinancialMetrics('600519.SH');

      // ROE = NetProfit / Equity
      expect(metrics.roe).toBeGreaterThan(0);
      expect(metrics.roe).toBeLessThan(100);
    });

    it('should calculate ROA correctly', async () => {
      const metrics = await reader.getFinancialMetrics('600519.SH');

      expect(metrics.roa).toBeGreaterThan(0);
      expect(metrics.roa).toBeLessThan(100);
    });

    it('should calculate margins correctly', async () => {
      const metrics = await reader.getFinancialMetrics('600519.SH');

      expect(metrics.grossMargin).toBeGreaterThan(0);
      expect(metrics.grossMargin).toBeLessThan(100);
      expect(metrics.netMargin).toBeGreaterThan(0);
      expect(metrics.netMargin).toBeLessThan(100);
    });

    it('should calculate debt ratio correctly', async () => {
      const metrics = await reader.getFinancialMetrics('600519.SH');

      expect(metrics.debtRatio).toBeGreaterThan(0);
      expect(metrics.debtRatio).toBeLessThan(100);
    });

    it('should include valuation metrics', async () => {
      const metrics = await reader.getFinancialMetrics('600519.SH');

      expect(metrics.pe).toBeGreaterThan(0);
      expect(metrics.pb).toBeGreaterThan(0);
    });

    it('should include growth metrics', async () => {
      const metrics = await reader.getFinancialMetrics('600519.SH');

      expect(metrics).toHaveProperty('revenueGrowth');
      expect(metrics).toHaveProperty('profitGrowth');
    });
  });

  describe('analyzeReport', () => {
    it('should return complete analysis', async () => {
      const analysis = await reader.analyzeReport('600519.SH');

      expect(analysis).toHaveProperty('report');
      expect(analysis).toHaveProperty('metrics');
      expect(analysis).toHaveProperty('highlights');
      expect(analysis).toHaveProperty('risks');
      expect(analysis).toHaveProperty('recommendation');
      expect(analysis).toHaveProperty('recommendationReason');
    });

    it('should include financial data in analysis', async () => {
      const analysis = await reader.analyzeReport('600519.SH');

      expect(analysis.report.tsCode).toBe('600519.SH');
      expect(analysis.metrics.roe).toBeGreaterThan(0);
    });

    it('should generate highlights', async () => {
      const analysis = await reader.analyzeReport('600519.SH');

      expect(analysis.highlights).toBeInstanceOf(Array);
    });

    it('should generate risks', async () => {
      const analysis = await reader.analyzeReport('600519.SH');

      expect(analysis.risks).toBeInstanceOf(Array);
    });

    it('should return valid recommendation', async () => {
      const analysis = await reader.analyzeReport('600519.SH');

      expect(['buy', 'hold', 'sell']).toContain(analysis.recommendation);
    });

    it('should include recommendation reason', async () => {
      const analysis = await reader.analyzeReport('600519.SH');

      expect(analysis.recommendationReason).toBeDefined();
      expect(analysis.recommendationReason.length).toBeGreaterThan(0);
    });
  });

  describe('getQuarterlyComparison', () => {
    it('should return multiple quarters of data', async () => {
      const reports = await reader.getQuarterlyComparison('600519.SH', 4);

      expect(reports).toHaveLength(4);
    });

    it('should return reports in chronological order', async () => {
      const reports = await reader.getQuarterlyComparison('600519.SH', 4);

      for (let i = 1; i < reports.length; i++) {
        expect(reports[i].reportDate).not.toBe(reports[i - 1].reportDate);
      }
    });

    it('should have different periods for each report', async () => {
      const reports = await reader.getQuarterlyComparison('600519.SH', 4);

      const periods = reports.map(r => r.reportDate);
      const uniquePeriods = new Set(periods);
      expect(uniquePeriods.size).toBe(4);
    });
  });

  describe('getFinancialReportReader', () => {
    it('should return singleton instance', () => {
      const r1 = getFinancialReportReader();
      const r2 = getFinancialReportReader();

      expect(r1).toBe(r2);
    });

    it('should accept custom config', () => {
      const customReader = getFinancialReportReader({
        aiConfig: { apiKey: 'test-key' },
      });

      expect(customReader).toBeInstanceOf(FinancialReportReader);
    });
  });

  describe('recommendation logic', () => {
    it('should recommend buy for high score', async () => {
      // High ROE, good growth, low PE
      const reader = new FinancialReportReader();
      const analysis = await reader.analyzeReport('600519.SH');

      // The mock AI returns bullish sentiment with high score
      // Combined with good metrics, should be buy/hold
      expect(['buy', 'hold']).toContain(analysis.recommendation);
    });

    it('should include ROE in recommendation reason', async () => {
      const analysis = await reader.analyzeReport('600519.SH');

      expect(analysis.recommendationReason).toContain('ROE');
    });

    it('should include growth in recommendation reason', async () => {
      const analysis = await reader.analyzeReport('600519.SH');

      expect(analysis.recommendationReason).toContain('增长');
    });
  });
});
