'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  AlertCircle,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { getMarginData, getMarginTrend, analyzeSentiment, type MarginResult, type MarginTrendResult } from '@/lib/actions/margin.actions';
import { formatWanAmount, formatDateToMM_DD } from '@/lib/utils';
import type { MarginData } from '@/lib/data-sources/astock/margin-trading';

/**
 * 融资融券面板组件属性
 */
interface MarginPanelProps {
  /** 股票代码（如 600519.SH 或 600519） */
  symbol: string;
  /** 是否显示趋势图，默认 true */
  showTrend?: boolean;
  /** 主题模式（预留扩展），目前仅支持深色 */
  theme?: 'light' | 'dark';
  /** 自定义类名 */
  className?: string;
}

/**
 * 多空情绪显示文本
 */
function formatSentiment(sentiment: 'bullish' | 'bearish' | 'neutral'): string {
  switch (sentiment) {
    case 'bullish':
      return '看多';
    case 'bearish':
      return '看空';
    case 'neutral':
      return '中性';
  }
}

/**
 * 获取多空情绪颜色类名
 */
function getSentimentColorClass(sentiment: 'bullish' | 'bearish' | 'neutral'): string {
  switch (sentiment) {
    case 'bullish':
      return 'text-red-400';
    case 'bearish':
      return 'text-green-400';
    case 'neutral':
      return 'text-gray-400';
  }
}

/**
 * 获取多空情绪背景色类名
 */
function getSentimentBgClass(sentiment: 'bullish' | 'bearish' | 'neutral'): string {
  switch (sentiment) {
    case 'bullish':
      return 'bg-red-400/20';
    case 'bearish':
      return 'bg-green-400/20';
    case 'neutral':
      return 'bg-gray-400/20';
  }
}

/**
 * 获取变化值颜色类名（A股红涨绿跌）
 *
 * 对于融资余额：增加 → 红色（看涨信号），减少 → 绿色
 * 对于融券余额：增加 → 绿色（看空信号），减少 → 红色
 */
function getChangeColorClass(isMargin: boolean, value: number): string {
  if (isMargin) {
    // 融资：增加是红色，减少是绿色
    if (value > 0) return 'text-red-400';
    if (value < 0) return 'text-green-400';
    return 'text-gray-400';
  } else {
    // 融券：增加是绿色（做空），减少是红色
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  }
}

/**
 * 获取变化图标
 */
function getChangeIcon(isMargin: boolean, value: number) {
  if (value > 0) return <ArrowUpRight className="w-3 h-3" />;
  if (value < 0) return <ArrowDownRight className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
}

/**
 * 融资融券面板组件
 *
 * 展示股票融资融券信息，包括：
 * - 融资余额与变化
 * - 融券余额与变化
 * - 融资买入/偿还额
 * - 融券卖出/偿还量
 * - N日趋势图
 * - 多空情绪分析
 *
 * @example
 * ```tsx
 * <MarginPanel symbol="600519.SH" showTrend={true} />
 * ```
 */
function MarginPanelComponent({
  symbol,
  showTrend = true,
  theme = 'dark',
  className = '',
}: MarginPanelProps) {
  const [marginData, setMarginData] = useState<MarginData | null>(null);
  const [trendData, setTrendData] = useState<MarginData[] | null>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<MarginTrendResult['trend'] | null>(null);
  const [sentiment, setSentiment] = useState<'bullish' | 'bearish' | 'neutral'>('neutral');
  const [confidence, setConfidence] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  // 提取公共数据获取逻辑
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsCached(false);

    try {
      // 并行获取融资融券数据和趋势数据
      const [marginResult, trendResult]: [MarginResult, MarginTrendResult] =
        await Promise.all([
          getMarginData(symbol),
          showTrend ? getMarginTrend(symbol, 5) : Promise.resolve({ success: true, data: undefined }),
        ]);

      // 处理融资融券数据
      if (marginResult.success && marginResult.data) {
        setMarginData(marginResult.data);
        setIsCached(marginResult.cached || false);
      } else {
        setError(marginResult.error || '获取融资融券数据失败');
      }

      // 处理趋势数据
      if (showTrend && trendResult.success && trendResult.data) {
        setTrendData(trendResult.data);
        if (trendResult.trend) {
          setTrendAnalysis(trendResult.trend);
          setSentiment(trendResult.trend.sentiment);
        }
      } else if (showTrend && trendResult.error) {
        console.warn('获取趋势数据失败:', trendResult.error);
      }

      // 如果至少有一个请求成功，不显示错误
      if (marginResult.data || (trendResult.data && trendResult.data.length > 0)) {
        setError(null);
      }

      // 尝试获取情绪分析（额外信息，失败不影响主流程）
      try {
        const sentimentResult = await analyzeSentiment(symbol, 5);
        if (sentimentResult.success && sentimentResult.data) {
          setSentiment(sentimentResult.data.sentiment);
          setConfidence(sentimentResult.data.confidence);
        }
      } catch (sentimentError) {
        console.warn('获取情绪分析失败:', sentimentError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取融资融券数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, showTrend]);

  // 初始加载和依赖变化时获取数据
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 刷新按钮处理函数
  const handleRefresh = () => {
    if (!isLoading) {
      fetchData();
    }
  };

  // 计算最大值用于趋势条渲染
  const maxMarginBalance = trendData && trendData.length > 0
    ? Math.max(...trendData.map(d => Math.abs(d.marginBalance)))
    : 0;

  return (
    <div className={`bg-gray-900/30 rounded-lg border border-gray-800 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <Scale className="w-5 h-5 mr-2 text-blue-500" />
          融资融券
        </h2>
        <div className="flex items-center space-x-2">
          {/* 缓存标识 */}
          {isCached && !isLoading && (
            <span className="text-xs text-yellow-500/70 bg-yellow-500/10 px-2 py-1 rounded">
              缓存数据
            </span>
          )}
          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isLoading ? '加载中...' : '刷新数据'}
            aria-label={isLoading ? '正在加载' : '刷新数据'}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-gray-400 text-sm">加载中...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-gray-400 text-sm">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 px-4 py-2 bg-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
            >
              重试
            </button>
          </div>
        </div>
      ) : !marginData && (!trendData || trendData.length === 0) ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 text-sm">暂无融资融券数据</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 融资融券余额卡片 */}
          {marginData && (
            <div className="grid grid-cols-2 gap-3">
              {/* 融资余额 */}
              <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">融资余额(万)</p>
                <div className="text-2xl font-bold font-mono text-white">
                  {formatWanAmount(marginData.marginBalance)}
                </div>
                {/* 融资买入/偿还 */}
                <div className="mt-3 pt-3 border-t border-gray-700 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">融资买入</span>
                    <span className="text-white font-mono">{formatWanAmount(marginData.marginBuy)}万</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">融资偿还</span>
                    <span className="text-white font-mono">{formatWanAmount(marginData.marginRepay)}万</span>
                  </div>
                </div>
              </div>

              {/* 融券余额 */}
              <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">融券余额(万)</p>
                <div className="text-2xl font-bold font-mono text-white">
                  {formatWanAmount(marginData.shortBalance)}
                </div>
                {/* 融券卖出/偿还 */}
                <div className="mt-3 pt-3 border-t border-gray-700 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">融券卖出</span>
                    <span className="text-white font-mono">{marginData.shortSell}手</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">融券偿还</span>
                    <span className="text-white font-mono">{marginData.shortCover}手</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 多空情绪指示器 */}
          {trendAnalysis && (
            <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${getSentimentBgClass(sentiment)}`}>
                    {sentiment === 'bullish' ? (
                      <TrendingUp className={`w-5 h-5 ${getSentimentColorClass(sentiment)}`} />
                    ) : sentiment === 'bearish' ? (
                      <TrendingDown className={`w-5 h-5 ${getSentimentColorClass(sentiment)}`} />
                    ) : (
                      <Activity className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {formatSentiment(sentiment)}
                      {confidence > 0 && (
                        <span className="ml-2 text-xs font-normal text-gray-400">
                          信心度 {confidence}%
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      融资融券比: {marginData?.marginRatio.toFixed(2) || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 变化统计 */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-700">
                <div>
                  <p className="text-[10px] text-gray-500">融资余额变化</p>
                  <div className={`flex items-center space-x-1 text-sm font-mono ${getChangeColorClass(true, trendAnalysis.marginBalanceChange)}`}>
                    {getChangeIcon(true, trendAnalysis.marginBalanceChange)}
                    <span>
                      {trendAnalysis.marginBalanceChange > 0 ? '+' : ''}
                      {formatWanAmount(trendAnalysis.marginBalanceChange)}万
                    </span>
                    <span className="text-xs">
                      ({trendAnalysis.marginBalanceChangeRate > 0 ? '+' : ''}
                      {trendAnalysis.marginBalanceChangeRate.toFixed(2)}%)
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">融券余额变化</p>
                  <div className={`flex items-center space-x-1 text-sm font-mono ${getChangeColorClass(false, trendAnalysis.shortBalanceChange)}`}>
                    {getChangeIcon(false, trendAnalysis.shortBalanceChange)}
                    <span>
                      {trendAnalysis.shortBalanceChange > 0 ? '+' : ''}
                      {formatWanAmount(trendAnalysis.shortBalanceChange)}万
                    </span>
                    <span className="text-xs">
                      ({trendAnalysis.shortBalanceChangeRate > 0 ? '+' : ''}
                      {trendAnalysis.shortBalanceChangeRate.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 趋势图 */}
          {showTrend && trendData && trendData.length > 0 && (
            <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">融资余额趋势</h3>
                <span className={`text-xs font-medium ${getSentimentColorClass(sentiment)}`}>
                  {formatSentiment(sentiment)}
                </span>
              </div>

              {/* 趋势条形图 */}
              <div className="space-y-2">
                {trendData.slice().reverse().map((dayData, index) => {
                  // 计算相对于前一天的变化
                  const prevData = trendData[trendData.length - 1 - index - 1];
                  const change = prevData ? dayData.marginBalance - prevData.marginBalance : 0;
                  const changeRate = prevData && prevData.marginBalance > 0
                    ? (change / prevData.marginBalance) * 100
                    : 0;

                  return (
                    <div key={`${dayData.tradeDate}-${index}`} className="flex items-center space-x-2">
                      <span className="text-[10px] text-gray-500 w-16 flex-shrink-0">
                        {formatDateToMM_DD(dayData.tradeDate)}
                      </span>
                      <div className="flex-1 bg-gray-700/50 rounded-full h-4 overflow-hidden relative">
                        <div
                          className={`h-full transition-all duration-300 ${
                            change >= 0 ? 'bg-red-400' : 'bg-green-400'
                          }`}
                          style={{
                            width: maxMarginBalance > 0
                              ? `${(Math.abs(dayData.marginBalance) / maxMarginBalance) * 100}%`
                              : '0%',
                          }}
                        />
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className={`text-[10px] font-mono ${getChangeColorClass(true, change)}`}>
                          {formatWanAmount(dayData.marginBalance)}
                        </span>
                        {changeRate !== 0 && (
                          <span className={`text-[9px] font-mono ${getChangeColorClass(true, change)}`}>
                            {changeRate > 0 ? '+' : ''}{changeRate.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {marginData && (
        <div className="mt-4 pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            数据来源：Tushare · 交易日期：{marginData.tradeDate}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * 自定义比较函数用于 React.memo
 * 仅在关键 props 变化时重新渲染
 */
const arePropsEqual = (
  prevProps: Readonly<MarginPanelProps>,
  nextProps: Readonly<MarginPanelProps>
): boolean => {
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.showTrend === nextProps.showTrend &&
    prevProps.theme === nextProps.theme &&
    prevProps.className === nextProps.className
  );
};

export default React.memo(MarginPanelComponent, arePropsEqual);
