'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, ExternalLink, AlertTriangle, Clock } from 'lucide-react';
import type { NewsArticle, NewsAnalysisResult } from '@/lib/data-sources/astock/ai-news-analyzer';

/**
 * 新闻分析卡片属性
 */
interface NewsAnalysisCardProps {
  /** 新闻文章 */
  article: NewsArticle;
  /** 分析结果（可选） */
  analysis?: NewsAnalysisResult;
  /** 是否正在加载分析 */
  isLoading?: boolean;
  /** 点击分析按钮的回调 */
  onAnalyze?: () => void;
  /** 点击卡片打开原文的回调 */
  onOpenUrl?: () => void;
  /** 主题模式 */
  theme?: 'light' | 'dark';
  /** 自定义类名 */
  className?: string;
}

/**
 * 获取情感颜色的函数
 * A股市场：红色=上涨=看涨，绿色=下跌=看跌
 */
function getSentimentColor(sentiment: 'bullish' | 'bearish' | 'neutral'): string {
  switch (sentiment) {
    case 'bullish':
      return 'text-red-400';  // 看涨 - 红色
    case 'bearish':
      return 'text-green-400'; // 看跌 - 绿色
    case 'neutral':
      return 'text-gray-400'; // 中性 - 灰色
  }
}

/**
 * 获取情感背景色
 */
function getSentimentBgColor(sentiment: 'bullish' | 'bearish' | 'neutral'): string {
  switch (sentiment) {
    case 'bullish':
      return 'bg-red-400/10 border-red-400/30';
    case 'bearish':
      return 'bg-green-400/10 border-green-400/30';
    case 'neutral':
      return 'bg-gray-400/10 border-gray-400/30';
  }
}

/**
 * 获取情感标签文本
 */
function getSentimentLabel(sentiment: 'bullish' | 'bearish' | 'neutral'): string {
  switch (sentiment) {
    case 'bullish':
      return '看涨';
    case 'bearish':
      return '看跌';
    case 'neutral':
      return '中性';
  }
}

/**
 * 获取风险等级颜色
 */
function getRiskColor(riskLevel: 'high' | 'medium' | 'low'): string {
  switch (riskLevel) {
    case 'high':
      return 'text-orange-400';
    case 'medium':
      return 'text-yellow-400';
    case 'low':
      return 'text-green-400';
  }
}

/**
 * 获取风险等级标签
 */
function getRiskLabel(riskLevel: 'high' | 'medium' | 'low'): string {
  switch (riskLevel) {
    case 'high':
      return '高风险';
    case 'medium':
      return '中等风险';
    case 'low':
      return '低风险';
  }
}

/**
 * 格式化日期
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * 新闻分析卡片组件
 *
 * 展示新闻标题、来源，AI 情感分析结果，关键事件标签和一句话摘要
 *
 * @example
 * ```tsx
 * <NewsAnalysisCard
 *   article={article}
 *   analysis={analysis}
 *   onAnalyze={() => handleAnalyze()}
 * />
 * ```
 */
export function NewsAnalysisCard({
  article,
  analysis,
  isLoading = false,
  onAnalyze,
  onOpenUrl,
  theme = 'dark',
  className = '',
}: NewsAnalysisCardProps) {
  const sentiment = analysis?.sentiment || 'neutral';
  const sentimentScore = analysis?.sentimentScore || 0;
  const riskLevel = analysis?.riskLevel || 'medium';

  return (
    <div
      className={`
        relative p-4 rounded-lg border transition-all duration-200
        ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'}
        ${analysis ? getSentimentBgColor(sentiment) : ''}
        hover:shadow-md
        ${className}
      `}
    >
      {/* 头部：标题和来源 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3
          className={`
            font-medium text-sm leading-tight flex-1
            ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}
            hover:underline cursor-pointer
          `}
          onClick={onOpenUrl}
          title={article.title}
        >
          {article.title}
        </h3>
        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`p-1 rounded hover:bg-gray-700/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* 来源和时间 */}
      <div className={`flex items-center gap-2 text-xs mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
        <span className="font-medium">{article.source}</span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDate(article.publishedAt)}
        </span>
      </div>

      {/* AI 分析结果 */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${theme === 'dark' ? 'border-gray-400' : 'border-gray-600'}`} />
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>AI 分析中...</span>
        </div>
      ) : analysis ? (
        <div className="space-y-3">
          {/* 情感指标 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {sentiment === 'bullish' && <TrendingUp className="w-5 h-5 text-red-400" />}
              {sentiment === 'bearish' && <TrendingDown className="w-5 h-5 text-green-400" />}
              {sentiment === 'neutral' && <Minus className="w-5 h-5 text-gray-400" />}
              <span className={`font-medium ${getSentimentColor(sentiment)}`}>
                {getSentimentLabel(sentiment)}
              </span>
              <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                ({sentimentScore > 0 ? '+' : ''}{sentimentScore.toFixed(2)})
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <AlertTriangle className={`w-3 h-3 ${getRiskColor(riskLevel)}`} />
              <span className={getRiskColor(riskLevel)}>{getRiskLabel(riskLevel)}</span>
            </div>
          </div>

          {/* 关键事件标签 */}
          {analysis.keyEvents && analysis.keyEvents.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {analysis.keyEvents.slice(0, 4).map((event, index) => (
                <span
                  key={index}
                  className={`
                    px-2 py-0.5 text-xs rounded-full
                    ${theme === 'dark'
                      ? 'bg-gray-800 text-gray-300'
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}
                >
                  {event}
                </span>
              ))}
              {analysis.keyEvents.length > 4 && (
                <span className={`px-2 py-0.5 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  +{analysis.keyEvents.length - 4}
                </span>
              )}
            </div>
          )}

          {/* 受影响股票 */}
          {analysis.impactStocks && analysis.impactStocks.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {analysis.impactStocks.slice(0, 3).map((stock, index) => (
                <a
                  key={index}
                  href={`/stocks/${stock}`}
                  className={`
                    px-2 py-0.5 text-xs rounded-full cursor-pointer transition-colors
                    ${theme === 'dark'
                      ? 'bg-[#0FEDBE]/10 text-[#0FEDBE] hover:bg-[#0FEDBE]/20'
                      : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                    }
                  `}
                >
                  {stock}
                </a>
              ))}
              {analysis.impactStocks.length > 3 && (
                <span className={`px-2 py-0.5 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                  +{analysis.impactStocks.length - 3}
                </span>
              )}
            </div>
          )}

          {/* AI 摘要 */}
          {analysis.summary && (
            <p
              className={`
                text-sm leading-relaxed
                ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
              `}
            >
              {analysis.summary}
            </p>
          )}
        </div>
      ) : (
        /* 无分析结果时显示分析按钮 */
        onAnalyze && (
          <button
            onClick={onAnalyze}
            className={`
              w-full py-2 px-3 rounded text-sm font-medium
              transition-colors
              ${theme === 'dark'
                ? 'bg-[#0FEDBE]/10 text-[#0FEDBE] hover:bg-[#0FEDBE]/20'
                : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
              }
            `}
          >
            AI 分析
          </button>
        )
      )}
    </div>
  );
}

/**
 * 新闻分析卡片组属性
 */
interface NewsAnalysisCardGroupProps {
  /** 新闻文章列表 */
  articles: NewsArticle[];
  /** 分析结果列表 */
  analyses?: NewsAnalysisResult[];
  /** 加载状态映射 */
  loadingMap?: Record<string, boolean>;
  /** 点击分析按钮的回调 */
  onAnalyze?: (article: NewsArticle) => void;
  /** 点击打开原文的回调 */
  onOpenUrl?: (url: string) => void;
  /** 主题模式 */
  theme?: 'light' | 'dark';
  /** 自定义类名 */
  className?: string;
}

/**
 * 新闻分析卡片组组件
 *
 * 展示多篇新闻的分析结果
 *
 * @example
 * ```tsx
 * <NewsAnalysisCardGroup
 *   articles={articles}
 *   analyses={analyses}
 *   onAnalyze={(article) => handleAnalyze(article)}
 * />
 * ```
 */
export function NewsAnalysisCardGroup({
  articles,
  analyses,
  loadingMap = {},
  onAnalyze,
  onOpenUrl,
  theme = 'dark',
  className = '',
}: NewsAnalysisCardGroupProps) {
  if (articles.length === 0) {
    return (
      <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
        暂无新闻数据
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {articles.map((article, index) => (
        <NewsAnalysisCard
          key={article.id || index}
          article={article}
          analysis={analyses?.[index]}
          isLoading={loadingMap[article.id || String(index)]}
          onAnalyze={onAnalyze ? () => onAnalyze(article) : undefined}
          onOpenUrl={article.url ? () => onOpenUrl?.(article.url!) : undefined}
          theme={theme}
        />
      ))}
    </div>
  );
}

export default NewsAnalysisCard;
