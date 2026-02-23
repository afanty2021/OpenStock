'use server';

import { AINewsAnalyzer, type NewsArticle, type NewsAnalysisResult } from '@/lib/data-sources/astock/ai-news-analyzer';
import { dataCache } from '@/lib/data-sources/cache';

/**
 * AI 新闻分析响应类型
 */
export type NewsAnalysisActionResult = {
  success: boolean;
  data?: NewsAnalysisResult;
  error?: string;
};

/**
 * 批量新闻分析响应类型
 */
export type BatchNewsAnalysisResult = {
  success: boolean;
  data?: NewsAnalysisResult[];
  error?: string;
};

/**
 * 热点话题响应类型
 */
export type HotTopicsResult = {
  success: boolean;
  data?: { id: string; title: string; hot: number; sentiment: string; relatedStocks: string[] }[];
  error?: string;
};

/**
 * 获取并分析新闻
 *
 * @param options - 查询选项
 * @param options.source - 新闻来源（可选）
 * @param options.startDate - 开始日期（YYYYMMDD）
 * @param options.endDate - 结束日期（YYYYMMDD）
 * @param options.limit - 返回条数限制
 * @param options.analyze - 是否进行分析（默认 true）
 * @returns 包含新闻和分析结果的响应
 *
 * @example
 * ```ts
 * const result = await getAndAnalyzeNews({ limit: 10 });
 * if (result.success && result.data) {
 *   console.log(result.data.news);
 *   console.log(result.data.analyses);
 * }
 * ```
 */
export async function getAndAnalyzeNews(options?: {
  source?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  analyze?: boolean;
}): Promise<{
  success: boolean;
  data?: {
    news: NewsArticle[];
    analyses?: NewsAnalysisResult[];
  };
  error?: string;
}> {
  try {
    const analyzer = new AINewsAnalyzer();
    const result = await analyzer.getAndAnalyzeNews(options);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Failed to get and analyze news:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 分析单条新闻
 *
 * @param article - 新闻文章
 * @returns 分析结果响应
 *
 * @example
 * ```ts
 * const article: NewsArticle = {
 *   id: '1',
 *   title: '茅台发布财报',
 *   content: '...',
 *   source: '财新',
 *   publishedAt: '2026-02-23',
 * };
 * const result = await analyzeSingleNews(article);
 * ```
 */
export async function analyzeSingleNews(
  article: NewsArticle
): Promise<NewsAnalysisActionResult> {
  // 检查缓存
  const cacheKey = `news-analysis:${article.id}`;
  const cached = dataCache.get(cacheKey) as NewsAnalysisResult | null;
  if (cached) {
    return {
      success: true,
      data: cached,
    };
  }

  try {
    const analyzer = new AINewsAnalyzer();
    const result = await analyzer.analyzeNews(article);

    // 缓存结果（1小时）
    dataCache.set(cacheKey, result, 60 * 60 * 1000);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Failed to analyze news:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 批量分析新闻
 *
 * @param articles - 新闻文章数组
 * @returns 批量分析结果响应
 *
 * @example
 * ```ts
 * const articles: NewsArticle[] = [...];
 * const result = await analyzeNewsBatch(articles);
 * ```
 */
export async function analyzeNewsBatch(
  articles: NewsArticle[]
): Promise<BatchNewsAnalysisResult> {
  try {
    const analyzer = new AINewsAnalyzer();
    const results = await analyzer.analyzeNewsBatch(articles);

    // 缓存每条分析结果
    articles.forEach((article, index) => {
      const cacheKey = `news-analysis:${article.id}`;
      dataCache.set(cacheKey, results[index], 60 * 60 * 1000);
    });

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    console.error('Failed to analyze news batch:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 获取市场热点话题
 *
 * @param limit - 返回条数限制（默认 20）
 * @returns 热点话题响应
 *
 * @example
 * ```ts
 * const result = await getMarketHotTopics(10);
 * ```
 */
export async function getMarketHotTopics(
  limit: number = 20
): Promise<HotTopicsResult> {
  // 检查缓存
  const cacheKey = `hot-topics:${limit}`;
  const cached = dataCache.get(cacheKey) as HotTopicsResult['data'] | null;
  if (cached) {
    return {
      success: true,
      data: cached,
    };
  }

  try {
    const analyzer = new AINewsAnalyzer();
    const topics = await analyzer.getMarketHotTopics(1);

    // 转换为前端需要的格式
    const data = topics.map(topic => ({
      id: topic.id,
      title: topic.title,
      hot: topic.hot,
      sentiment: topic.sentiment,
      relatedStocks: topic.relatedStocks,
    }));

    // 缓存结果（30分钟）
    dataCache.set(cacheKey, data, 30 * 60 * 1000);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Failed to get market hot topics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
