'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, RefreshCw, AlertCircle, Activity } from 'lucide-react';
import { getMoneyFlowData, getMoneyFlowTrend, type MoneyFlowResult, type MoneyFlowTrendResult } from '@/lib/actions/moneyflow.actions';
import { formatWanAmount, formatDateToMM_DD } from '@/lib/utils';
import type { MoneyFlowData, MoneyFlowTrendAnalysis } from '@/lib/data-sources/astock/money-flow-monitor';

/**
 * 资金流向卡片组件属性
 */
interface MoneyFlowCardProps {
  /** 股票代码（如 600519.SH 或 600519） */
  symbol: string;
  /** 是否显示5日趋势，默认 true */
  showTrend?: boolean;
  /** 主题模式（预留扩展），目前仅支持深色 */
  theme?: 'light' | 'dark';
  /** 自定义类名 */
  className?: string;
}

/**
 * 格式化趋势方向为中文
 */
function formatTrendDirection(trend: 'bullish' | 'bearish' | 'neutral'): string {
  switch (trend) {
    case 'bullish':
      return '看涨';
    case 'bearish':
      return '看跌';
    case 'neutral':
      return '中性';
  }
}

/**
 * 获取趋势方向的颜色类名
 */
function getTrendColorClass(trend: 'bullish' | 'bearish' | 'neutral'): string {
  switch (trend) {
    case 'bullish':
      return 'text-red-400';
    case 'bearish':
      return 'text-green-400';
    case 'neutral':
      return 'text-gray-400';
  }
}

/**
 * 获取资金流向颜色类名（红涨绿跌）
 */
function getMoneyFlowColorClass(value: number): string {
  if (value > 0) return 'text-red-400';
  if (value < 0) return 'text-green-400';
  return 'text-gray-400';
}

/**
 * 获取背景色类名（用于趋势条）
 */
function getTrendBgClass(value: number): string {
  if (value > 0) return 'bg-red-400/20';
  if (value < 0) return 'bg-green-400/20';
  return 'bg-gray-400/20';
}

/**
 * 资金流向卡片组件
 *
 * 展示股票资金流向信息，包括：
 * - 主力资金流入/流出
 * - 大单交易情况
 * - 5日趋势图
 *
 * @example
 * ```tsx
 * <MoneyFlowCard symbol="600519.SH" showTrend={true} />
 * ```
 */
function MoneyFlowCardComponent({
  symbol,
  showTrend = true,
  theme = 'dark',
  className = '',
}: MoneyFlowCardProps) {
  const [moneyFlow, setMoneyFlow] = useState<MoneyFlowData | null>(null);
  const [trendData, setTrendData] = useState<MoneyFlowTrendAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 提取公共数据获取逻辑，避免重复
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 并行获取资金流向和趋势数据
      const [flowResult, trendResult]: [MoneyFlowResult, MoneyFlowTrendResult] =
        await Promise.all([
          getMoneyFlowData(symbol),
          showTrend ? getMoneyFlowTrend(symbol, 5) : Promise.resolve({ success: true, data: undefined }),
        ]);

      // 处理资金流向数据
      if (flowResult.success && flowResult.data) {
        setMoneyFlow(flowResult.data);
      } else {
        // 如果两个请求都失败，显示错误
        if (!trendResult.success || !trendResult.data) {
          setError(flowResult.error || 'Failed to load money flow data');
        }
      }

      // 处理趋势数据
      if (showTrend && trendResult.success && trendResult.data) {
        setTrendData(trendResult.data);
      } else if (showTrend && trendResult.error) {
        console.warn('Failed to load trend data:', trendResult.error);
      }

      // 如果至少有一个请求成功，不显示错误
      if (flowResult.data || (trendResult.data && trendResult.data.data.length > 0)) {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load money flow data');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, showTrend]);

  // 初始加载和依赖变化时获取数据
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 刷新按钮处理函数（已内置防抖，因为isLoading为true时按钮禁用）
  const handleRefresh = () => {
    if (!isLoading) {
      fetchData();
    }
  };

  // 计算最大值用于趋势条渲染
  const maxMainInflow = trendData?.data && trendData.data.length > 0
    ? Math.max(...trendData.data.map(d => Math.abs(d.netMainInflow)))
    : 0;

  return (
    <div className={`bg-gray-900/30 rounded-lg border border-gray-800 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-yellow-500" />
          资金流向
        </h2>
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

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-3">
            <RefreshCw className="w-8 h-8 text-yellow-500 animate-spin" />
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
              className="mt-2 px-4 py-2 bg-yellow-500/20 text-yellow-500 rounded-lg hover:bg-yellow-500/30 transition-colors text-sm"
            >
              重试
            </button>
          </div>
        </div>
      ) : !moneyFlow && (!trendData || trendData.data.length === 0) ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 text-sm">暂无资金流向数据</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 主力净流入卡片 */}
          {moneyFlow && (
            <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">主力净流入</p>
                  <div className={`text-2xl font-bold font-mono ${getMoneyFlowColorClass(moneyFlow.netMainInflow)}`}>
                    {moneyFlow.netMainInflow > 0 ? '+' : ''}{formatWanAmount(Math.abs(moneyFlow.netMainInflow))}万
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    占比: {moneyFlow.mainInflowRate.toFixed(2)}%
                  </p>
                </div>
                <div className={`p-3 rounded-full ${getTrendBgClass(moneyFlow.netMainInflow)}`}>
                  {moneyFlow.netMainInflow > 0 ? (
                    <TrendingUp className={`w-6 h-6 ${getMoneyFlowColorClass(moneyFlow.netMainInflow)}`} />
                  ) : moneyFlow.netMainInflow < 0 ? (
                    <TrendingDown className={`w-6 h-6 ${getMoneyFlowColorClass(moneyFlow.netMainInflow)}`} />
                  ) : (
                    <Activity className="w-6 h-6 text-gray-400" />
                  )}
                </div>
              </div>

              {/* 分项数据 */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-700">
                <div>
                  <p className="text-[10px] text-gray-500">超大单</p>
                  <p className={`text-sm font-mono ${getMoneyFlowColorClass(moneyFlow.superLargeInflow)}`}>
                    {moneyFlow.superLargeInflow > 0 ? '+' : ''}{formatWanAmount(moneyFlow.superLargeInflow)}万
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">大单净买</p>
                  <p className={`text-sm font-mono ${getMoneyFlowColorClass(moneyFlow.largeNet)}`}>
                    {moneyFlow.largeNet > 0 ? '+' : ''}{moneyFlow.largeNet.toFixed(2)}万股
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">中单</p>
                  <p className={`text-sm font-mono ${getMoneyFlowColorClass(moneyFlow.mediumInflow)}`}>
                    {moneyFlow.mediumInflow > 0 ? '+' : ''}{formatWanAmount(moneyFlow.mediumInflow)}万
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">散户</p>
                  <p className={`text-sm font-mono ${getMoneyFlowColorClass(moneyFlow.retailInflow)}`}>
                    {moneyFlow.retailInflow > 0 ? '+' : ''}{formatWanAmount(moneyFlow.retailInflow)}万
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 趋势分析 */}
          {showTrend && trendData && trendData.data.length > 0 && (
            <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">5日趋势</h3>
                <span className={`text-xs font-medium ${getTrendColorClass(trendData.trend)}`}>
                  {formatTrendDirection(trendData.trend)}
                </span>
              </div>

              {/* 趋势统计 */}
              <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-gray-700">
                <div className="text-center">
                  <p className="text-[10px] text-gray-500">平均净流入</p>
                  <p className={`text-xs font-mono ${getMoneyFlowColorClass(trendData.avgMainInflow)}`}>
                    {trendData.avgMainInflow > 0 ? '+' : ''}{formatWanAmount(trendData.avgMainInflow)}万
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500">总净流入</p>
                  <p className={`text-xs font-mono ${getMoneyFlowColorClass(trendData.totalMainInflow)}`}>
                    {trendData.totalMainInflow > 0 ? '+' : ''}{formatWanAmount(trendData.totalMainInflow)}万
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500">连续天数</p>
                  <p className="text-xs font-mono text-white">
                    {trendData.consecutiveInflowDays > 0
                      ? `${trendData.consecutiveInflowDays}日流入`
                      : trendData.consecutiveOutflowDays > 0
                        ? `${trendData.consecutiveOutflowDays}日流出`
                        : '-'}
                  </p>
                </div>
              </div>

              {/* 趋势条形图 */}
              <div className="space-y-2">
                {trendData.data.slice().reverse().map((dayData, index) => (
                  <div key={`${dayData.tradeDate}-${index}`} className="flex items-center space-x-2">
                    <span className="text-[10px] text-gray-500 w-16 flex-shrink-0">
                      {formatDateToMM_DD(dayData.tradeDate)}
                    </span>
                    <div className="flex-1 bg-gray-700/50 rounded-full h-4 overflow-hidden relative">
                      <div
                        className={`h-full absolute top-0 transition-all duration-300 ${
                          dayData.netMainInflow > 0 ? 'bg-red-400' : dayData.netMainInflow < 0 ? 'bg-green-400' : 'bg-gray-400'
                        }`}
                        style={{
                          width: maxMainInflow > 0 ? `${(Math.abs(dayData.netMainInflow) / maxMainInflow) * 100}%` : '0%',
                          left: dayData.netMainInflow >= 0 ? '50%' : `${50 - (maxMainInflow > 0 ? (Math.abs(dayData.netMainInflow) / maxMainInflow) * 50 : 0)}%`,
                        }}
                      />
                      {/* 中心线 */}
                      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-600" />
                    </div>
                    <span className={`text-[10px] font-mono w-16 text-right flex-shrink-0 ${getMoneyFlowColorClass(dayData.netMainInflow)}`}>
                      {dayData.netMainInflow > 0 ? '+' : ''}{formatWanAmount(dayData.netMainInflow)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {moneyFlow && (
        <div className="mt-4 pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            数据来源：Tushare · 交易日期：{moneyFlow.tradeDate}
            <span className="ml-2 text-yellow-500/70">· 大单交易数据为模拟值</span>
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
  prevProps: Readonly<MoneyFlowCardProps>,
  nextProps: Readonly<MoneyFlowCardProps>
): boolean => {
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.showTrend === nextProps.showTrend &&
    prevProps.theme === nextProps.theme &&
    prevProps.className === nextProps.className
  );
};

export default React.memo(MoneyFlowCardComponent, arePropsEqual);
