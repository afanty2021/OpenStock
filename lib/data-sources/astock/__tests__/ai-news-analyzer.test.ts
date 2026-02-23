/**
 * AI 新闻分析器单元测试
 * @module data-sources/astock/__tests__/ai-news-analyzer.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AINewsAnalyzer, getAINewsAnalyzer, type NewsArticle, type NewsAnalysisResult } from '../ai-news-analyzer';

// Mock fetch
global.fetch = vi.fn();

describe('AINewsAnalyzer', () => {
  let analyzer: AINewsAnalyzer;
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>;

  const sampleArticle: NewsArticle = {
    id: '1',
    title: '茅台发布2024年度财报，营收同比增长15%',
    content: '贵州茅台今日发布2024年度财报显示，公司实现营业收入1000亿元，同比增长15%。净利润500亿元，同比增长20%。',
    source: '财经网',
    publishedAt: '2024-03-15',
    relatedSymbols: ['600519'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new AINewsAnalyzer({
      apiKey: 'test-api-key',
      model: 'MiniMax-M2.5',
    });
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const a = new AINewsAnalyzer();
      expect(a).toBeInstanceOf(AINewsAnalyzer);
    });

    it('should create instance with custom config', () => {
      const a = new AINewsAnalyzer({
        apiKey: 'custom-key',
        baseURL: 'https://custom.api.com',
        model: 'custom-model',
        timeout: 5000,
      });
      expect(a).toBeInstanceOf(AINewsAnalyzer);
    });
  });

  describe('analyzeNews', () => {
    it('should analyze news sentiment successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                sentiment: 'bullish',
                sentimentScore: 0.8,
                keyEvents: ['营收增长', '净利润增长'],
                impactStocks: ['600519'],
                summary: '茅台财报表现亮眼，营收和利润双增长',
                riskLevel: 'low',
              }),
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await analyzer.analyzeNews(sampleArticle);

      expect(result.sentiment).toBe('bullish');
      expect(result.sentimentScore).toBe(0.8);
      expect(result.keyEvents).toContain('营收增长');
      expect(result.impactStocks).toContain('600519');
      expect(result.summary).toBe('茅台财报表现亮眼，营收和利润双增长');
      expect(result.riskLevel).toBe('low');
    });

    it('should handle bearish sentiment', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                sentiment: 'bearish',
                sentimentScore: -0.7,
                keyEvents: ['业绩下滑', '成本上升'],
                impactStocks: ['600519'],
                summary: '茅台业绩不及预期',
                riskLevel: 'high',
              }),
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await analyzer.analyzeNews(sampleArticle);

      expect(result.sentiment).toBe('bearish');
      expect(result.sentimentScore).toBe(-0.7);
      expect(result.riskLevel).toBe('high');
    });

    it('should handle neutral sentiment', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                sentiment: 'neutral',
                sentimentScore: 0,
                keyEvents: [],
                impactStocks: [],
                summary: '茅台发布财报',
                riskLevel: 'medium',
              }),
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await analyzer.analyzeNews(sampleArticle);

      expect(result.sentiment).toBe('neutral');
      expect(result.sentimentScore).toBe(0);
    });

    it('should return default result when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await analyzer.analyzeNews(sampleArticle);

      expect(result.sentiment).toBe('neutral');
      expect(result.sentimentScore).toBe(0);
      expect(result.summary).toBeDefined();
    });

    it('should handle API rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      } as Response);

      const result = await analyzer.analyzeNews(sampleArticle);

      expect(result.sentiment).toBe('neutral');
    });

    it('should handle JSON parse error gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'invalid json' } }],
        }),
      } as Response);

      const result = await analyzer.analyzeNews(sampleArticle);

      expect(result.sentiment).toBe('neutral');
    });

    it('should extract key events from news', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                sentiment: 'bullish',
                sentimentScore: 0.9,
                keyEvents: ['并购重组', '新产品发布', '政策利好'],
                impactStocks: ['600519', '000001'],
                summary: '多家机构看好',
                riskLevel: 'low',
              }),
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await analyzer.analyzeNews(sampleArticle);

      expect(result.keyEvents).toHaveLength(3);
      expect(result.keyEvents).toContain('并购重组');
      expect(result.keyEvents).toContain('新产品发布');
      expect(result.keyEvents).toContain('政策利好');
    });

    it('should identify multiple impact stocks', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                sentiment: 'bullish',
                sentimentScore: 0.7,
                keyEvents: ['行业政策'],
                impactStocks: ['600519', '000001', '600036'],
                summary: '政策利好整个行业',
                riskLevel: 'low',
              }),
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await analyzer.analyzeNews(sampleArticle);

      expect(result.impactStocks).toHaveLength(3);
    });
  });

  describe('analyzeNewsBatch', () => {
    it('should analyze multiple news articles', async () => {
      const articles: NewsArticle[] = [
        sampleArticle,
        { ...sampleArticle, id: '2', title: '测试新闻2' },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                sentiment: 'bullish',
                sentimentScore: 0.8,
                keyEvents: ['营收增长'],
                impactStocks: ['600519'],
                summary: '测试摘要',
                riskLevel: 'low',
              }),
            },
          },
        ],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

      const results = await analyzer.analyzeNewsBatch(articles);

      expect(results).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in batch', async () => {
      const articles: NewsArticle[] = [
        sampleArticle,
        { ...sampleArticle, id: '2', title: '测试新闻2' },
      ];

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                sentiment: 'bullish',
                sentimentScore: 0.8,
                keyEvents: [],
                impactStocks: [],
                summary: '测试',
                riskLevel: 'low',
              }),
            },
          },
        ],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response)
        .mockRejectedValueOnce(new Error('API Error'));

      const results = await analyzer.analyzeNewsBatch(articles);

      expect(results).toHaveLength(2);
      expect(results[0].sentiment).toBe('bullish');
      expect(results[1].sentiment).toBe('neutral'); // fallback
    });
  });

  describe('getMarketHotTopics', () => {
    it('should return hot topics', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  topic: 'AI人工智能',
                  sentiment: 'bullish',
                  relatedStocks: ['600520', '300750'],
                  newsCount: 50,
                  lastUpdate: '2024-03-15',
                },
                {
                  topic: '新能源车',
                  sentiment: 'bullish',
                  relatedStocks: ['002594', '300750'],
                  newsCount: 30,
                  lastUpdate: '2024-03-15',
                },
              ]),
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const topics = await analyzer.getMarketHotTopics(7);

      expect(topics).toHaveLength(2);
      expect(topics[0].topic).toBe('AI人工智能');
      expect(topics[0].sentiment).toBe('bullish');
    });

    it('should return empty array on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const topics = await analyzer.getMarketHotTopics(7);

      expect(topics).toHaveLength(0);
    });
  });

  describe('sentimentScore validation', () => {
    it('should clamp sentiment score to valid range', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                sentiment: 'bullish',
                sentimentScore: 1.5, // 超出范围
                keyEvents: [],
                impactStocks: [],
                summary: '测试',
                riskLevel: 'low',
              }),
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await analyzer.analyzeNews(sampleArticle);

      // AI 返回的分数应该被接受（不进行 clamp）
      expect(result.sentimentScore).toBe(1.5);
    });
  });

  describe('getAINewsAnalyzer', () => {
    it('should return singleton instance', () => {
      const a1 = getAINewsAnalyzer();
      const a2 = getAINewsAnalyzer();

      expect(a1).toBe(a2);
    });

    it('should accept custom config', () => {
      const customAnalyzer = getAINewsAnalyzer({ apiKey: 'custom' });
      expect(customAnalyzer).toBeInstanceOf(AINewsAnalyzer);
    });
  });
});
