/**
 * AI 新闻分析器
 *
 * 利用 MiniMax AI 分析财经新闻，提取情感、关键事件、受影响股票等信息
 * @module data-sources/astock/ai-news-analyzer
 */

import type { NewsArticle, NewsAnalysisResult, HotTopic } from './types';

/**
 * AI 新闻分析器配置
 */
interface AINewsAnalyzerConfig {
  /** MiniMax API Key */
  apiKey?: string;
  /** API 基础 URL */
  baseURL?: string;
  /** 模型名称 */
  model?: string;
  /** 请求超时时间（毫秒）*/
  timeout?: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AINewsAnalyzerConfig = {
  baseURL: 'https://api.minimaxi.com/v1',
  model: 'MiniMax-M2.5',
  timeout: 30000,
};

/**
 * 市场热点话题
 */
export interface HotTopic {
  topic: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  relatedStocks: string[];
  newsCount: number;
  lastUpdate: string;
}

/**
 * AI 新闻分析器类
 *
 * 提供财经新闻的 AI 分析功能：
 * - 新闻情感分析（看涨/看跌/中性）
 * - 关键事件提取（并购、财报、政策等）
 * - 受影响股票识别
 * - AI 摘要生成
 * - 风险等级评估
 */
export class AINewsAnalyzer {
  private config: AINewsAnalyzerConfig;

  constructor(config: AINewsAnalyzerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 获取 API Key
   */
  private getApiKey(): string {
    return this.config.apiKey || process.env.MINIMAX_API_KEY || '';
  }

  /**
   * 调用 MiniMax AI API
   */
  private async callAI(prompt: string): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('MINIMAX_API_KEY is not configured');
    }

    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(this.config.timeout || 30000),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MiniMax API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * 解析 AI 返回的 JSON 结果
   */
  private parseJSONResponse<T>(content: string): T {
    // 尝试提取 JSON 块
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) ||
                     content.match(/```\n([\s\S]*?)\n```/) ||
                     content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch {
        // 继续尝试直接解析
      }
    }

    // 尝试直接解析
    try {
      return JSON.parse(content);
    } catch {
      throw new Error(`Failed to parse AI response as JSON: ${content.substring(0, 200)}`);
    }
  }

  /**
   * 分析单条新闻
   */
  async analyzeNews(article: NewsArticle): Promise<NewsAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(article);

    try {
      const aiResponse = await this.callAI(prompt);
      const result = this.parseJSONResponse<Partial<NewsAnalysisResult>>(aiResponse);

      return {
        sentiment: result.sentiment || 'neutral',
        sentimentScore: result.sentimentScore ?? 0,
        keyEvents: result.keyEvents || [],
        impactStocks: result.impactStocks || [],
        summary: result.summary || this.generateFallbackSummary(article),
        riskLevel: result.riskLevel || 'medium',
      };
    } catch (error) {
      console.error('AI News analysis error:', error);
      // 返回默认结果而不是抛出错误
      return {
        sentiment: 'neutral',
        sentimentScore: 0,
        keyEvents: [],
        impactStocks: article.relatedSymbols || [],
        summary: this.generateFallbackSummary(article),
        riskLevel: 'medium',
      };
    }
  }

  /**
   * 批量分析新闻
   */
  async analyzeNewsBatch(articles: NewsArticle[]): Promise<NewsAnalysisResult[]> {
    const results: NewsAnalysisResult[] = [];

    // 串行处理以避免 API 限流
    for (const article of articles) {
      const result = await this.analyzeNews(article);
      results.push(result);

      // 添加短暂延迟以避免 API 限流
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * 获取市场热点话题
   */
  async getMarketHotTopics(days: number = 7): Promise<HotTopic[]> {
    const prompt = `
作为金融市场分析师，请根据最近 ${days} 天的市场新闻，分析并返回热点话题。

请以 JSON 数组格式返回，每个话题包含：
{
  "topic": "话题名称",
  "sentiment": "bullish/bearish/neutral（看涨/看跌/中性）",
  "relatedStocks": ["相关股票代码数组"],
  "newsCount": 关联新闻数量,
  "lastUpdate": "最后更新时间 YYYY-MM-DD"
}

请返回 5-10 个热点话题。只返回 JSON 数组，不要其他内容。
`.trim();

    try {
      const aiResponse = await this.callAI(prompt);
      const topics = this.parseJSONResponse<HotTopic[]>(aiResponse);
      return topics;
    } catch (error) {
      console.error('Failed to get market hot topics:', error);
      return [];
    }
  }

  /**
   * 构建分析提示词
   */
  private buildAnalysisPrompt(article: NewsArticle): string {
    return `
你是一位专业的金融市场分析师。请分析以下新闻文章：

标题：${article.title}
内容：${article.content}
来源：${article.source}
发布时间：${article.publishedAt}
相关股票：${article.relatedSymbols.join(', ') || '无'}

请分析并返回以下信息（JSON 格式）：
{
  "sentiment": "bullish（看涨）/bearish（看跌）/neutral（中性）",
  "sentimentScore": -1 到 1 之间的数值（-1 强烈看跌，1 强烈看涨）,
  "keyEvents": ["关键事件1", "关键事件2"]，如并购、财报、政策、业绩等,
  "impactStocks": ["受影响股票代码"]，如 600519、000001 等,
  "summary": "一句话摘要，不超过 50 字",
  "riskLevel": "high（高风险）/medium（中等风险）/low（低风险）"
}

请只返回 JSON，不要其他内容。
`.trim();
  }

  /**
   * 生成备用摘要
   */
  private generateFallbackSummary(article: NewsArticle): string {
    // 简单提取标题前50字
    return article.title.substring(0, 50) + (article.title.length > 50 ? '...' : '');
  }
}

/**
 * 创建默认的 AI 新闻分析器实例
 */
let defaultAnalyzer: AINewsAnalyzer | null = null;

export function getAINewsAnalyzer(config?: AINewsAnalyzerConfig): AINewsAnalyzer {
  if (!defaultAnalyzer) {
    defaultAnalyzer = new AINewsAnalyzer(config);
  }
  return defaultAnalyzer;
}

// 导出类型
export type { NewsArticle, NewsAnalysisResult, AINewsAnalyzerConfig };
