'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react';
import { getTopListData, type TopListDataResult } from '@/lib/actions/toplist.actions';
import { formatWanAmount } from '@/lib/utils';
import type { TopListItem } from '@/lib/data-sources/astock/top-list-viewer';
import { VirtualTable } from './VirtualTable';

interface VirtualTopListPanelProps {
  symbol?: string;
  limit?: number;
  showReason?: boolean;
  className?: string;
  /** 启用虚拟列表（数据量大于20时自动启用） */
  enableVirtual?: boolean;
}

export default function VirtualTopListPanel({
  symbol,
  limit = 10,
  showReason = true,
  className = '',
  enableVirtual,
}: VirtualTopListPanelProps) {
  const [topList, setTopList] = useState<TopListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 提取公共数据获取逻辑
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result: TopListDataResult = await getTopListData(symbol, limit);

      if (result.success) {
        setTopList(result.data);
        if (result.data.length === 0) {
          setError(null);
        }
      } else {
        setError(result.error || 'Failed to load top list data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load top list data');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    if (!isLoading) {
      fetchData();
    }
  };

  // 判断是否使用虚拟列表
  const shouldUseVirtual = enableVirtual !== undefined
    ? enableVirtual
    : topList.length > 20;

  return (
    <div className={`bg-gray-900/30 rounded-lg border border-gray-800 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-yellow-500" />
          {symbol ? `${symbol} 龙虎榜` : `龙虎榜 TOP${limit}`}
          {shouldUseVirtual && (
            <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
              虚拟列表
            </span>
          )}
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
      ) : topList.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 text-sm">暂无龙虎榜数据</p>
        </div>
      ) : shouldUseVirtual ? (
        /* 虚拟列表模式 */
        <VirtualTable
          data={topList}
          estimateRowHeight={60}
          getKey={(item) => `${item.tsCode}-${item.tradeDate}`}
          height="500px"
          header={
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-3 py-2 text-gray-400 font-medium text-xs">#</th>
                  <th className="px-3 py-2 text-gray-400 font-medium text-xs">股票</th>
                  <th className="px-3 py-2 text-gray-400 font-medium text-xs text-right">买入(万)</th>
                  <th className="px-3 py-2 text-gray-400 font-medium text-xs text-right">卖出(万)</th>
                  <th className="px-3 py-2 text-gray-400 font-medium text-xs text-right">净买入(万)</th>
                  {showReason && (
                    <th className="px-3 py-2 text-gray-400 font-medium text-xs">上榜理由</th>
                  )}
                </tr>
              </thead>
            </table>
          }
          renderRow={(item, index) => {
            const isPositive = item.netAmount > 0;
            const netAmountPercent = item.buyAmount + item.sellAmount > 0
              ? (item.netAmount / (item.buyAmount + item.sellAmount)) * 100
              : 0;

            return (
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-gray-800">
                  <tr className="hover:bg-white/5 transition-colors">
                    {/* Rank */}
                    <td className="px-3 py-3 text-gray-500 font-medium w-12">
                      {index + 1}
                    </td>

                    {/* Stock Info */}
                    <td className="px-3 py-3">
                      <Link
                        href={`/stocks/${item.tsCode}`}
                        className="flex flex-col hover:text-yellow-500 transition-colors"
                      >
                        <span className="font-semibold text-white text-sm">{item.name}</span>
                        <span className="text-xs text-gray-400 font-mono">{item.tsCode}</span>
                      </Link>
                    </td>

                    {/* Buy Amount */}
                    <td className="px-3 py-3 text-right w-24">
                      <span className="text-red-400 font-mono text-xs">
                        {formatWanAmount(item.buyAmount)}
                      </span>
                    </td>

                    {/* Sell Amount */}
                    <td className="px-3 py-3 text-right w-24">
                      <span className="text-green-400 font-mono text-xs">
                        {formatWanAmount(item.sellAmount)}
                      </span>
                    </td>

                    {/* Net Amount */}
                    <td className="px-3 py-3 text-right w-32">
                      <div className={`flex items-center justify-end space-x-1 ${isPositive ? 'text-red-400' : 'text-green-400'}`}>
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span className="font-mono text-xs font-semibold">
                          {isPositive ? '+' : ''}{formatWanAmount(Math.abs(item.netAmount))}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          ({isPositive ? '+' : ''}{netAmountPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </td>

                    {/* Reason */}
                    {showReason && (
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10">
                          {item.reason}
                        </span>
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            );
          }}
          emptyState={
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500 text-sm">暂无龙虎榜数据</p>
            </div>
          }
        />
      ) : (
        /* 普通表格模式 */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-3 py-2 text-gray-400 font-medium text-xs">#</th>
                <th className="px-3 py-2 text-gray-400 font-medium text-xs">股票</th>
                <th className="px-3 py-2 text-gray-400 font-medium text-xs text-right">买入(万)</th>
                <th className="px-3 py-2 text-gray-400 font-medium text-xs text-right">卖出(万)</th>
                <th className="px-3 py-2 text-gray-400 font-medium text-xs text-right">净买入(万)</th>
                {showReason && (
                  <th className="px-3 py-2 text-gray-400 font-medium text-xs">上榜理由</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {topList.map((item, index) => {
                const isPositive = item.netAmount > 0;
                const netAmountPercent = item.buyAmount + item.sellAmount > 0
                  ? (item.netAmount / (item.buyAmount + item.sellAmount)) * 100
                  : 0;

                return (
                  <tr key={`${item.tsCode}-${item.tradeDate}`} className="hover:bg-white/5 transition-colors">
                    {/* Rank */}
                    <td className="px-3 py-3 text-gray-500 font-medium">
                      {index + 1}
                    </td>

                    {/* Stock Info */}
                    <td className="px-3 py-3">
                      <Link
                        href={`/stocks/${item.tsCode}`}
                        className="flex flex-col hover:text-yellow-500 transition-colors"
                      >
                        <span className="font-semibold text-white text-sm">{item.name}</span>
                        <span className="text-xs text-gray-400 font-mono">{item.tsCode}</span>
                      </Link>
                    </td>

                    {/* Buy Amount */}
                    <td className="px-3 py-3 text-right">
                      <span className="text-red-400 font-mono text-xs">
                        {formatWanAmount(item.buyAmount)}
                      </span>
                    </td>

                    {/* Sell Amount */}
                    <td className="px-3 py-3 text-right">
                      <span className="text-green-400 font-mono text-xs">
                        {formatWanAmount(item.sellAmount)}
                      </span>
                    </td>

                    {/* Net Amount */}
                    <td className="px-3 py-3 text-right">
                      <div className={`flex items-center justify-end space-x-1 ${isPositive ? 'text-red-400' : 'text-green-400'}`}>
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span className="font-mono text-xs font-semibold">
                          {isPositive ? '+' : ''}{formatWanAmount(Math.abs(item.netAmount))}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          ({isPositive ? '+' : ''}{netAmountPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </td>

                    {/* Reason */}
                    {showReason && (
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10">
                          {item.reason}
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {topList.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            数据来源：Tushare · 交易日期：{topList[0]?.tradeDate}
          </p>
        </div>
      )}
    </div>
  );
}
